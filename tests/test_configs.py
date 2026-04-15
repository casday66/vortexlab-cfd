import json
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


class ConfigTestCase(unittest.TestCase):
    def test_configs_are_valid(self) -> None:
        for path in sorted((ROOT / "configs").glob("*.json")):
            with self.subTest(path=path.name):
                payload = json.loads(path.read_text(encoding="utf-8"))
                self.assertIn("domain", payload)
                self.assertIn("flow", payload)
                self.assertIn("obstacles", payload)
                self.assertGreater(payload["domain"]["nx"], 50)
                self.assertGreater(payload["domain"]["ny"], 30)
                self.assertGreater(payload["flow"]["reynolds"], 1)
                self.assertGreater(len(payload["obstacles"]), 0)

    def test_readme_mentions_interactive_simulator(self) -> None:
        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        self.assertIn("interactive", readme.lower())
        self.assertIn("Lattice Boltzmann", readme)


if __name__ == "__main__":
    unittest.main()

