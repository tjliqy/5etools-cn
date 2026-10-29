import json
import sqlite3
import subprocess
import tempfile
import unittest
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parents[1]
QUEUE = SCRIPT_DIR / "homebrew_translation_queue.py"
CHUNKS = SCRIPT_DIR / "homebrew_translation_chunks.py"


class ChunkTranslationTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.source = self.root / "source"
        self.repo = self.root / "target"
        self.worktrees = self.root / "worktrees"
        self.database = self.root / "state" / "queue.sqlite3"
        (self.source / "adventure").mkdir(parents=True)
        self.repo.mkdir()
        self._git("init")
        self._git("config", "user.email", "chunks-test@example.invalid")
        self._git("config", "user.name", "Chunks Test")
        (self.repo / "package.json").write_text('{}\n', encoding="utf-8")
        self._git("add", "package.json")
        self._git("commit", "-m", "base")
        self.relative = "adventure/A; Large.json"
        self.source_file = self.source / self.relative
        self.source_file.write_text(json.dumps({
            "_meta": {"sources": [{"json": "Large"}]},
            "adventure": [
                {"name": "Sea King", "entries": ["The Sea King waits."]},
                {"name": "Sea King", "entries": ["The Sea King returns."]},
            ],
        }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        self._run(QUEUE, "sync")

    def tearDown(self):
        subprocess.run(["git", "-C", str(self.repo), "worktree", "prune"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        self.temporary.cleanup()

    def _git(self, *args):
        return subprocess.run(["git", "-C", str(self.repo), *args], check=True, text=True, stdout=subprocess.PIPE).stdout.strip()

    def _run(self, script, *args, expected=0):
        command = [
            "python3", str(script), "--database", str(self.database),
            "--source-root", str(self.source), "--target-repo", str(self.repo),
            "--worktree-root", str(self.worktrees), *args,
        ]
        completed = subprocess.run(command, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        self.assertEqual(completed.returncode, expected, completed.stdout + completed.stderr)
        return json.loads(completed.stdout)

    def _plan_and_lock_term(self, max_chars=60):
        plan = self._run(CHUNKS, "plan", "--source-path", self.relative, "--max-chunk-chars", str(max_chars))
        self.assertGreater(plan["chunks"], 1)
        self.assertTrue(Path(plan["glossary_file"]).is_file())
        self._run(CHUNKS, "start-inventory", "--source-path", self.relative, "--worker-id", "main")
        self._run(
            CHUNKS, "set-term", "--source-path", self.relative,
            "--english", "Sea King", "--sense", "adventure", "--chinese", "海王", "--worker-id", "main",
        )
        self._run(CHUNKS, "lock-glossary", "--source-path", self.relative, "--worker-id", "main")
        return plan

    def test_chunk_plan_and_claim_wait_for_parent_integration(self):
        parent_relative = "adventure/B; Parent.json"
        (self.source / parent_relative).write_text(json.dumps({"_meta": {"sources": [{"json": "Parent"}]}}), encoding="utf-8")
        data = json.loads(self.source_file.read_text(encoding="utf-8"))
        data["_meta"]["dependencies"] = {"adventure": ["Parent"]}
        self.source_file.write_text(json.dumps(data), encoding="utf-8")
        generated = self.source / "_generated"
        generated.mkdir()
        (generated / "index-sources.json").write_text(json.dumps({"Parent": parent_relative}), encoding="utf-8")
        self._run(QUEUE, "sync")
        waiting = self._run(CHUNKS, "plan", "--source-path", self.relative, expected=3)
        self.assertEqual(waiting["dependencies"], [parent_relative])
        with sqlite3.connect(self.database) as connection:
            connection.execute("UPDATE tasks SET status = 'merged' WHERE source_path = ?", (parent_relative,))
        self._run(CHUNKS, "plan", "--source-path", self.relative)
        self._run(CHUNKS, "start-inventory", "--source-path", self.relative, "--worker-id", "main")
        self._run(CHUNKS, "set-term", "--source-path", self.relative,
                  "--english", "Sea King", "--sense", "adventure", "--chinese", "海王", "--worker-id", "main")
        self._run(CHUNKS, "lock-glossary", "--source-path", self.relative, "--worker-id", "main")
        with sqlite3.connect(self.database) as connection:
            connection.execute("UPDATE tasks SET status = 'ready' WHERE source_path = ?", (parent_relative,))
        waiting = self._run(CHUNKS, "claim-chunk", "--source-path", self.relative, "--worker-id", "worker-a", expected=3)
        self.assertEqual(waiting["dependencies"], [parent_relative])
        with sqlite3.connect(self.database) as connection:
            connection.execute("UPDATE tasks SET status = 'merged' WHERE source_path = ?", (parent_relative,))
        claim = self._run(CHUNKS, "claim-chunk", "--source-path", self.relative, "--worker-id", "worker-a")
        self.assertEqual(claim["status"], "leased")

    def _complete_claim(self, claim, chinese="海王"):
        worktree = Path(claim["worktree"])
        target = worktree / (claim.get("target") or "adventure/A; 大型冒险.json")
        if not target.exists():
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(self.source_file.read_bytes())
        data = json.loads(target.read_text(encoding="utf-8"))
        usage_paths = []
        for pointer in claim["pointers"]:
            if pointer == "/adventure/0":
                data["adventure"][0]["name"] = chinese
                usage_paths.append("/adventure/0/name")
            if pointer == "/adventure/1":
                data["adventure"][1]["name"] = chinese
                usage_paths.append("/adventure/1/name")
        target.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        subprocess.run(["git", "-C", str(worktree), "add", target.relative_to(worktree).as_posix()], check=True)
        subprocess.run([
            "git", "-C", str(worktree), "-c", "user.email=test@example.invalid", "-c", "user.name=Test",
            "commit", "-m", claim["chunk_id"],
        ], check=True, stdout=subprocess.PIPE)
        commit = subprocess.run(["git", "-C", str(worktree), "rev-parse", "HEAD"], check=True, text=True, stdout=subprocess.PIPE).stdout.strip()
        report = {
            "target": target.relative_to(worktree).as_posix(),
            "commit_sha": commit,
            "glossary_version": claim["glossary_version"],
            "review": {"result": "PASS", "rounds": 1},
            "term_usage": ([{
                "english": "Sea King", "sense": "adventure", "chinese": chinese, "paths": usage_paths,
            }] if usage_paths else []),
            "term_proposals": [],
        }
        report_path = self.root / f"{claim['chunk_id']}.json"
        report_path.write_text(json.dumps(report), encoding="utf-8")
        return report_path

    def test_chunk_completion_rejects_locked_term_mismatch(self):
        self._plan_and_lock_term()
        while True:
            claim = self._run(CHUNKS, "claim-chunk", "--source-path", self.relative, "--worker-id", "worker-a", expected=0)
            report = self._complete_claim(claim, chinese="海王以外" if "/adventure/0" in claim["pointers"] else "海王")
            if "/adventure/0" in claim["pointers"]:
                result = self._run(CHUNKS, "complete-chunk", "--lease-id", claim["lease_id"], "--result", str(report), expected=2)
                self.assertTrue(any("locked term mismatch" in error for error in result["errors"]))
                break
            self._run(CHUNKS, "complete-chunk", "--lease-id", claim["lease_id"], "--result", str(report))

    def test_chunks_can_be_leased_concurrently_after_target_bootstrap(self):
        plan = self._plan_and_lock_term()
        first = self._run(CHUNKS, "claim-chunk", "--source-path", self.relative, "--worker-id", "worker-bootstrap")
        report = self._complete_claim(first)
        self._run(CHUNKS, "complete-chunk", "--lease-id", first["lease_id"], "--result", str(report))
        second = self._run(CHUNKS, "claim-chunk", "--source-path", self.relative, "--worker-id", "worker-2")
        third = self._run(CHUNKS, "claim-chunk", "--source-path", self.relative, "--worker-id", "worker-3")
        self.assertNotEqual(second["chunk_id"], third["chunk_id"])
        self.assertNotEqual(second["worktree"], third["worktree"])
        report_second = self._complete_claim(second)
        report_third = self._complete_claim(third)
        self._run(CHUNKS, "complete-chunk", "--lease-id", second["lease_id"], "--result", str(report_second))
        self._run(CHUNKS, "complete-chunk", "--lease-id", third["lease_id"], "--result", str(report_third))

    def test_untracked_bootstrap_target_is_reused_for_first_chunk(self):
        plan = self._plan_and_lock_term()
        target = Path(plan["worktree"]) / "adventure" / "A; 大型冒险.json"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(self.source_file.read_bytes())
        claim = self._run(CHUNKS, "claim-chunk", "--source-path", self.relative, "--worker-id", "legacy-bootstrap")
        self.assertEqual(claim["worktree"], plan["worktree"])
        self.assertEqual(claim["target"], "adventure/A; 大型冒险.json")
        report = self._complete_claim(claim)
        self._run(CHUNKS, "complete-chunk", "--lease-id", claim["lease_id"], "--result", str(report))

    def test_initial_glossary_gate_and_cross_chunk_variants_are_rejected(self):
        self._run(CHUNKS, "plan", "--source-path", self.relative, "--max-chunk-chars", "60")
        waiting = self._run(CHUNKS, "claim-chunk", "--source-path", self.relative, "--worker-id", "worker-a", expected=3)
        self.assertEqual(waiting["status"], "waiting_glossary")
        self._run(CHUNKS, "start-inventory", "--source-path", self.relative, "--worker-id", "main")
        another_owner = self._run(CHUNKS, "start-inventory", "--source-path", self.relative, "--worker-id", "other", expected=3)
        self.assertEqual(another_owner["status"], "waiting_glossary")
        self._run(CHUNKS, "set-term", "--source-path", self.relative,
                  "--english", "Sea King", "--sense", "adventure", "--chinese", "海王", "--status", "contextual", "--worker-id", "main")
        self._run(CHUNKS, "lock-glossary", "--source-path", self.relative, "--worker-id", "main")
        while True:
            claim = self._run(CHUNKS, "claim-chunk", "--source-path", self.relative, "--worker-id", "worker-a")
            if "/adventure/0" in claim["pointers"]:
                first = claim
                break
            report = self._complete_claim(claim)
            self._run(CHUNKS, "complete-chunk", "--lease-id", claim["lease_id"], "--result", str(report))
        report_first = self._complete_claim(first, "海王")
        self._run(CHUNKS, "complete-chunk", "--lease-id", first["lease_id"], "--result", str(report_first))
        while True:
            claim = self._run(CHUNKS, "claim-chunk", "--source-path", self.relative, "--worker-id", "worker-b")
            if "/adventure/1" in claim["pointers"]:
                report_second = self._complete_claim(claim, "海之王")
                self._run(CHUNKS, "complete-chunk", "--lease-id", claim["lease_id"], "--result", str(report_second))
                break
            report = self._complete_claim(claim)
            self._run(CHUNKS, "complete-chunk", "--lease-id", claim["lease_id"], "--result", str(report))
        audit = self._run(CHUNKS, "audit-terminology", "--source-path", self.relative, expected=2)
        self.assertTrue(any("inconsistent term: Sea King (adventure)" in error for error in audit["errors"]))

    def test_unfinished_chunks_block_ordinary_claims_and_new_plans(self):
        self._plan_and_lock_term()
        self._run(CHUNKS, "start-inventory", "--source-path", self.relative, "--worker-id", "editor")
        glossary_lease = self._run(CHUNKS, "claim-chunk", "--source-path", self.relative,
                                   "--worker-id", "translation-worker", expected=3)
        self.assertEqual(glossary_lease["status"], "waiting_glossary")
        self._run(CHUNKS, "release-inventory", "--source-path", self.relative, "--worker-id", "editor")
        ordinary = self._run(QUEUE, "claim", "--worker-id", "ordinary-worker", expected=3)
        self.assertEqual(ordinary["status"], "waiting_chunked")
        other_relative = "adventure/B; Other Large.json"
        (self.source / other_relative).write_text(self.source_file.read_text(encoding="utf-8"), encoding="utf-8")
        self._run(QUEUE, "sync")
        planned = self._run(CHUNKS, "plan", "--source-path", other_relative, expected=3)
        self.assertEqual(planned["status"], "waiting_chunked_parent")

    def test_abort_parent_removes_checkpoints_and_requeues_for_planning(self):
        plan = self._plan_and_lock_term()
        result = self._run(
            CHUNKS, "abort-parent", "--source-path", self.relative,
            "--reason", "source changed",
        )
        self.assertEqual(result["status"], "needs_chunking")
        self.assertFalse(Path(plan["worktree"]).exists())
        with sqlite3.connect(self.database) as connection:
            parent_count = connection.execute("SELECT COUNT(*) FROM translation_parents").fetchone()[0]
        self.assertEqual(parent_count, 0)

    def test_all_chunks_finalize_as_one_ready_commit(self):
        plan = self._plan_and_lock_term()
        for _ in range(plan["chunks"]):
            claim = self._run(CHUNKS, "claim-chunk", "--source-path", self.relative, "--worker-id", "worker-a")
            report = self._complete_claim(claim)
            self._run(CHUNKS, "complete-chunk", "--lease-id", claim["lease_id"], "--result", str(report))
        audit = self._run(CHUNKS, "audit-terminology", "--source-path", self.relative)
        self.assertEqual(audit["result"], "PASS")
        final_report = {
            "source_hash": plan["source_hash"],
            "target": "adventure/A; 大型冒险.json",
            "commit_sha": "replaced-by-finalizer",
            "analyser": {"jobs": 2, "actionable": 2, "residual": 0, "unresolved_paths": 0},
            "review": {"rounds": 1, "result": "PASS"},
            "terminology": {"result": "PASS"},
            "global_terminology_review": {"result": "PASS", "chunks_reviewed": [f"chunk-{i:04d}" for i in range(1, plan["chunks"] + 1)]},
            "validation": {key: "PASS" for key in ("json", "structure", "schema", "build", "tests")},
        }
        report_path = self.root / "final.json"
        report_path.write_text(json.dumps(final_report), encoding="utf-8")
        ready = self._run(CHUNKS, "finalize", "--source-path", self.relative, "--result", str(report_path))
        self.assertEqual(ready["status"], "ready")
        parents = self._git("rev-list", "--parents", "-n", "1", ready["commit_sha"]).split()
        self.assertEqual(len(parents), 2)


if __name__ == "__main__":
    unittest.main()
