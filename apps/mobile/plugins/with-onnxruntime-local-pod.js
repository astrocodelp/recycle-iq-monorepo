/**
 * Points CocoaPods at the local onnxruntime-c pod in vendor/onnxruntime-c (see its README): the official
 * pod's download host fails TLS verification. Adds one line to the app target in the generated Podfile.
 */
const { withPodfile } = require('expo/config-plugins');

const LINE = "  pod 'onnxruntime-c', :podspec => File.join(__dir__, '..', 'vendor', 'onnxruntime-c', 'onnxruntime-c.podspec')";

module.exports = function withOnnxruntimeLocalPod(config) {
  return withPodfile(config, (cfg) => {
    let podfile = cfg.modResults.contents;
    if (!podfile.includes("pod 'onnxruntime-c'")) {
      podfile = podfile.replace(/(target ['"][^'"]+['"] do\n)/, `$1${LINE}\n`);
    }
    cfg.modResults.contents = podfile;
    return cfg;
  });
};
