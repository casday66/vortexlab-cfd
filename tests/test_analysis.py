import math
import unittest

from python.analyze_wake import analyze


class AnalysisTestCase(unittest.TestCase):
    def test_strouhal_estimation_from_synthetic_lift(self) -> None:
        rows = []
        period = 40.0
        for step in range(400):
            rows.append(
                {
                    "step": float(step),
                    "cd_proxy": 1.2 + 0.05 * math.sin(step / 17.0),
                    "cl_proxy": math.sin(2 * math.pi * step / period),
                }
            )
        result = analyze(rows, length=20.0, velocity=0.05, discard_fraction=0.25, smooth=5)
        self.assertIsNotNone(result["strouhal"])
        self.assertAlmostEqual(result["frequency_lattice_steps"], 1.0 / period, delta=0.002)


if __name__ == "__main__":
    unittest.main()
