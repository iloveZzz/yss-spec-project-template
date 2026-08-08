#!/usr/bin/env python3
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("generate_controller.py")


class GenerateControllerTest(unittest.TestCase):
    def test_uses_application_service_and_validation_profile(self):
        metadata = {
            "tables": [
                {
                    "table_name": "quality_rule",
                    "table_comment": "质量规则",
                    "columns": [
                        {"name": "id", "sql_type": "bigint", "primary": True, "nullable": False},
                        {"name": "rule_name", "sql_type": "varchar(64)", "nullable": False},
                    ],
                }
            ]
        }
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            metadata_path = root / "metadata.json"
            metadata_path.write_text(json.dumps(metadata), encoding="utf-8")
            subprocess.run(
                [
                    sys.executable,
                    str(SCRIPT),
                    "--metadata-file",
                    str(metadata_path),
                    "--base-package",
                    "com.yss.demo",
                    "--module-name",
                    "demo",
                    "--domain-segment",
                    "quality",
                    "--output-dir",
                    str(root / "out"),
                    "--application-service-package",
                    "com.yss.demo.application.service",
                    "--validation-namespace",
                    "jakarta",
                ],
                check=True,
                capture_output=True,
                text=True,
            )
            controller = next((root / "out").rglob("QualityRuleController.java")).read_text(encoding="utf-8")
            query = next((root / "out").rglob("QualityRulePageQuery.java")).read_text(encoding="utf-8")

        self.assertIn("import com.yss.demo.application.service.QualityRuleService;", controller)
        self.assertIn("private final QualityRuleService qualityRuleService;", controller)
        self.assertNotIn("Gateway", controller)
        self.assertIn("@Valid @RequestBody QualityRuleAddCmd", controller)
        self.assertIn("import com.yss.demo.client.dto.query.QualityRulePageQuery;", controller)
        self.assertNotIn("import com.yss.demo.client.dto.query.QualityRulePage;", controller)
        self.assertIn("import jakarta.validation.Valid;", controller)
        self.assertIn("class QualityRulePageQuery extends PageQuery", query)


if __name__ == "__main__":
    unittest.main()
