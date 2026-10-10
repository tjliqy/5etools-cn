import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock


SCRIPT = Path(__file__).resolve().parents[1] / "run_homebrew_tests.py"
SPEC = importlib.util.spec_from_file_location("run_homebrew_tests", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class HomebrewTestBaselineTests(unittest.TestCase):
    def _main(self, argv, results):
        with mock.patch.object(sys, "argv", [str(SCRIPT), *argv]), mock.patch.object(MODULE, "run", return_value=results):
            return MODULE.main()

    def test_capture_requires_clean_baseline_by_default(self):
        results = [{"script": "test:file-props", "exit_code": 1, "output": "failure"}]
        with tempfile.TemporaryDirectory() as directory:
            report = Path(directory) / "baseline.json"
            self.assertEqual(self._main(["--capture-baseline", str(report)], results), 1)
            saved = json.loads(report.read_text(encoding="utf-8"))
            self.assertFalse(saved["clean"])
            self.assertEqual(saved["failures"], ["test:file-props"])

    def test_diagnostic_escape_hatch_allows_failing_baseline(self):
        results = [{"script": "test:file-props", "exit_code": 1, "output": "failure"}]
        with tempfile.TemporaryDirectory() as directory:
            report = Path(directory) / "baseline.json"
            self.assertEqual(self._main(["--capture-baseline", str(report), "--allow-failing-baseline"], results), 0)

    def test_comparison_rejects_failing_baseline_before_running_tests(self):
        baseline = {"results": [{"script": "test:file-props", "exit_code": 1, "output": "failure"}]}
        with tempfile.TemporaryDirectory() as directory:
            report = Path(directory) / "baseline.json"
            report.write_text(json.dumps(baseline), encoding="utf-8")
            with mock.patch.object(sys, "argv", [str(SCRIPT), "--baseline-report", str(report)]), mock.patch.object(MODULE, "run") as runner:
                self.assertEqual(MODULE.main(), 1)
                runner.assert_not_called()


if __name__ == "__main__":
    unittest.main()
