"""External-action boundaries of the generated delivery plan, without cloud writes."""
import sys
from pathlib import Path
import unittest

sys.path.insert(0, str(Path(__file__).parents[1] / 'scripts'))
from report_to_google_doc.plan import build_docx_upload_plan, write_docx_upload_readme


class DeliveryPlanTests(unittest.TestCase):
    def plan(self, target='local-docx', status='passed'):
        return build_docx_upload_plan({'title': '报告', 'source_html': 'report.html'}, Path('report.docx'), {'status': status}, target)

    def test_local_conversion_has_no_remote_sequence(self):
        plan = self.plan()
        self.assertEqual(plan['sequence'], [])
        self.assertFalse(plan['remote_action_performed'])
        self.assertEqual(plan['target'], 'local-docx')

    def test_cloud_plans_require_discovery_and_explicit_request(self):
        for target in ['hosted-docx', 'native-google-docs']:
            plan = self.plan(target)
            step = plan['sequence'][0]
            self.assertNotIn('tool', step)
            self.assertTrue(step['discovery_required'])
            self.assertTrue(step['requires_explicit_user_request'])
            self.assertFalse(plan['remote_action_performed'])
        self.assertNotEqual(self.plan('hosted-docx')['sequence'][0]['capability'], self.plan('native-google-docs')['sequence'][0]['capability'])

    def test_failed_validation_never_emits_cloud_steps(self):
        for target in ['hosted-docx', 'native-google-docs']:
            self.assertEqual(self.plan(target, 'failed')['sequence'], [])

    def test_unknown_target_is_rejected(self):
        with self.assertRaises(ValueError): self.plan('share-everywhere')

    def test_readme_keeps_native_and_hosted_results_distinct(self):
        readme = write_docx_upload_readme(Path('report.html'), {'title': '报告', 'source_html': 'report.html'}, {'status': 'passed'}, Path('report.docx'), 'native-google-docs')
        self.assertIn('hosted DOCX does not satisfy', readme)
        self.assertIn('performs no remote actions', readme)
        self.assertNotIn('mcp__', readme)


if __name__ == '__main__':
    unittest.main()
