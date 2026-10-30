export const committedPluginCommands = {
  'check.plugin-entry-migration': "node .template-source/scripts/plugin-candidate.mjs run --tooling scripts/test-with-plugin-clis.mjs test/plugin-entry-migration.test.mjs test/plugin-project.test.mjs",
  'check.plugin-backend-profile': 'node .template-source/scripts/plugin-candidate.mjs run --test .template-source/tooling/node/test/backend-plugin-profile.test.mjs .template-source/tooling/node/test/plugin-build.test.mjs',
  'check.plugin-supported-scope': "node .template-source/scripts/plugin-candidate.mjs run --test --test-skip-pattern='当前主机真实公开打包' .template-source/plugins/yss-backend-delivery/tests/permissions.test.mjs .template-source/tooling/node/test/plugin-native-schema.test.mjs",
};

export function committedPluginEnvironment(environment) {
  const bound={};
  for(const key of ['TEMPLATE_SHA','CLI_ROOT','CLI_SHA','CLI_REMOTE','CLI_REF','BINARY','BINARY_SHA256','RECEIPT','RECEIPT_SHA256','GO','GO_SHA256']){
    const name=`YSS_PLUGIN_COMMITTED_${key}`;
    if(!environment[name])throw new TypeError(`committed plugin input missing: ${name}`);
    bound[name]=environment[name];
  }
  return {...bound,NODE_OPTIONS:'',NODE_PATH:''};
}
