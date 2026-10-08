import importlib.util
import json
import subprocess
import tempfile
import types
import unittest
from pathlib import Path


SCRIPTS = Path(__file__).resolve().parents[1]


def load(name):
    spec = importlib.util.spec_from_file_location(name, SCRIPTS / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


jobs = load("analyze_translation_jobs")
repairer = load("repair_bootstrap_candidate")
schema = load("compare_homebrew_schema")
tests = load("run_homebrew_tests")


class HelperTests(unittest.TestCase):
    def test_resolve_localized_named_path(self):
        target = {"feat": [{"ENG_name": "Silver Soul", "name": "银龙之魂", "entries": ["中文"]}]}
        path, value = jobs.resolve_job_value(target, "/feat[name=Silver-Soul]/entries[0]")
        self.assertEqual(path, "/feat/0/entries/0")
        self.assertEqual(value, "中文")

    def test_resolve_embedded_tag_path_to_parent_string(self):
        target = {"feat": [{"ENG_name": "Silver Soul", "name": "银龙之魂", "entries": ["施展 {@spell 月华之光}"]}]}
        path, value = jobs.resolve_job_target(target, "/feat[name=Silver-Soul]/entries[0]/spell[0]")
        self.assertEqual(path, "/feat/0/entries/0")
        self.assertEqual(value, "施展 {@spell 月华之光}")

    def test_resolve_embedded_tag_path_digit_leading_tag(self):
        target = {"feat": [{"ENG_name": "Silver Soul", "name": "银龙之魂", "entries": ["见 {@5etools 快速参考}"]}]}
        path, value = jobs.resolve_job_target(target, "/feat[name=Silver-Soul]/entries[0]/5etools[0]")
        self.assertEqual(path, "/feat/0/entries/0")
        self.assertEqual(value, "见 {@5etools 快速参考}")

    def test_machine_tag_field_accepts_digit_leading_tag_url(self):
        job = types.SimpleNamespace(uid="/adventure[0]/data/entries[0].5etools[0].1", en_str="book.html#phb,9")
        self.assertTrue(jobs.is_machine_tag_field(job))
        job = types.SimpleNamespace(uid="/adventure[0]/data/entries[0].5etools[0].1", en_str="quickreference.html#bookref-quick,3,surprise,0")
        self.assertTrue(jobs.is_machine_tag_field(job))

    def test_machine_tag_field_accepts_area_route_id_with_spaces(self):
        job = types.SimpleNamespace(uid="/adventure[0]/data/entries[0].area[0].1", en_str="3. Pressure Plate Trap")
        self.assertTrue(jobs.is_machine_tag_field(job))

    def test_machine_tag_field_still_rejects_prose_and_unknown_routes(self):
        # Prose pipe fields of non-route tags stay translatable residuals when left English.
        job = types.SimpleNamespace(uid="/feat[0]/entries[0].note[0].1", en_str="some untranslated prose")
        self.assertFalse(jobs.is_machine_tag_field(job))
        # Field 0 display text is never machine regardless of tag.
        job = types.SimpleNamespace(uid="/feat[0]/entries[0].area[0].0", en_str="HFN2025")
        self.assertFalse(jobs.is_machine_tag_field(job))

    def test_machine_tag_field_accepts_variable_formula_with_spaces(self):
        # Variable-tag field 0 formulas ("10 + PB") contain spaces but are machine values.
        job = types.SimpleNamespace(uid="/monster[0]/action[0]/entries[0].dc[0].0", en_str="10 + PB")
        self.assertTrue(jobs.is_machine_tag_field(job))
        job = types.SimpleNamespace(uid="/monster[0]/action[0]/entries[0].damage[0].0", en_str="1d6 − 1")
        self.assertTrue(jobs.is_machine_tag_field(job))

    def test_machine_tag_field_accepts_ability_and_skillcheck_variables(self):
        job = types.SimpleNamespace(uid="/fluff[0]/entries[1].ability[0].0", en_str="int 20")
        self.assertTrue(jobs.is_machine_tag_field(job))
        job = types.SimpleNamespace(uid="/fluff[0]/entries[1].skillCheck[0].0", en_str="arcana 8")
        self.assertTrue(jobs.is_machine_tag_field(job))

    def test_machine_tag_field_accepts_style_token_with_semicolon(self):
        job = types.SimpleNamespace(uid="/bookData[0]/data[0]/entries[1].style[0].1", en_str="dnd-font;large")
        self.assertTrue(jobs.is_machine_tag_field(job))

    def test_repair_restores_structure_and_scalars(self):
        source = {"$schema": "url", "meta": {"stamp": 1}, "items": [{"name": "English", "n": 2}]}
        candidate = {"meta": {"stamp": 9}, "items": [{"ENG_name": "English", "name": "中文", "n": 7}]}
        repaired, changes = repairer.repair(source, candidate)
        self.assertEqual(repaired["$schema"], "url")
        self.assertEqual(repaired["meta"]["stamp"], 1)
        self.assertEqual(repaired["items"][0]["name"], "中文")
        self.assertEqual(repaired["items"][0]["ENG_name"], "English")
        self.assertEqual(repaired["items"][0]["n"], 2)
        self.assertTrue(changes)

    def test_placeholder_detection(self):
        self.assertEqual(repairer.find_placeholders({"x": ["{!@ $.x}"]}), ["/x/0"])

    def test_repair_restores_placeholder_to_english_fallback(self):
        repaired, changes = repairer.repair({"name": "Moonbeam"}, {"name": "{!@ $.name}"})
        self.assertEqual(repaired["name"], "Moonbeam")
        self.assertEqual(changes[0]["action"], "restore_placeholder_fallback")
        self.assertEqual(repairer.find_placeholders(repaired), [])

    def test_schema_error_extraction(self):
        output = 'prefix\n[{"instancePath":"/x","schemaPath":"#/a","keyword":"type","message":"bad"}]\nsuffix'
        self.assertEqual(schema.extract_errors(output)[0]["instancePath"], "/x")

    def test_empty_schema_error_output_is_not_schema_evidence(self):
        self.assertEqual(schema.extract_errors("validator crashed"), [])

    def test_test_output_normalization(self):
        self.assertEqual(tests.normalized("Ran in 1.2s\nRun duration: 3ms"), "Ran in <duration>\nRun duration: <duration>")

    def test_structure_compare_accepts_explicit_snapshot_outside_source_root(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "snapshot.json"
            target = root / "target.json"
            source.write_text(json.dumps({"name": "English", "value": 1}), encoding="utf-8")
            target.write_text(json.dumps({"name": "中文", "value": 1}), encoding="utf-8")
            completed = subprocess.run(
                ["python3", str(SCRIPTS / "compare_json_structure.py"), str(source), str(target), "--mode", "homebrew"],
                text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            )
            self.assertEqual(completed.returncode, 0, completed.stdout + completed.stderr)


if __name__ == "__main__":
    unittest.main()
