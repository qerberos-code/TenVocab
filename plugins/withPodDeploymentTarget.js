// Xcode 27 refuses to build any target whose deployment target is below iOS 15.
// A few third-party pods (AsyncStorage's resource bundle, for one) still declare 13.4,
// so this plugin pins every pod target to the app's own minimum at `pod install` time.
// It runs during `expo prebuild`, which is how the ios/ folder is generated.
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARK = '# [withPodDeploymentTarget]';
const SNIPPET = `
    ${MARK}
    installer.pods_project.targets.each do |t|
      t.build_configurations.each do |c|
        if c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < 15.1
          c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
        end
      end
    end
`;

module.exports = function withPodDeploymentTarget(config) {
  return withDangerousMod(config, ['ios', (cfg) => {
    const podfile = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
    let src = fs.readFileSync(podfile, 'utf8');
    if (!src.includes(MARK)) {
      src = src.replace(/post_install do \|installer\|\n/, (m) => m + SNIPPET);
      fs.writeFileSync(podfile, src);
    }
    return cfg;
  }]);
};
