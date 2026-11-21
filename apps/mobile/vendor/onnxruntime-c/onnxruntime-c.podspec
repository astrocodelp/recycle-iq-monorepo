# Local copy of the official onnxruntime-c 1.24.3 pod.
#
# Why: the official pod downloads from download.onnxruntime.ai, whose TLS certificate (*.azureedge.net)
# does not match that host name, so CocoaPods refuses the download on EAS. The archive next to this file
# holds the same Microsoft build, taken from the official NuGet package Microsoft.ML.OnnxRuntime 1.24.3
# (runtimes/ios/native/onnxruntime.xcframework.zip, its headers and LICENSE), repackaged in the pod's
# layout with the Mac Catalyst slice removed (we only build iOS). See README.md here to rebuild it.
# Remove this pod (and plugins/with-onnxruntime-local-pod.js) once the official download works again.
Pod::Spec.new do |s|
  s.name                = 'onnxruntime-c'
  s.version             = '1.24.3'
  s.summary             = 'ONNX Runtime C/C++ Pod (local copy of the official build)'
  s.description         = 'A pod for the ONNX Runtime C/C++ library.'
  s.homepage            = 'https://github.com/microsoft/onnxruntime'
  s.license             = { :type => 'MIT', :file => 'LICENSE' }
  s.authors             = { 'ONNX Runtime' => 'onnxruntime@microsoft.com' }
  s.source              = {
    :http => "file://#{File.expand_path('pod-archive-onnxruntime-c-1.24.3.zip', __dir__)}",
    :sha256 => '1d06a18faade1e9a0dc66a5c3e8d761d287fff0c490bbcb99193b6bc308ed84c',
  }
  s.platforms           = { :ios => '15.1' }
  s.vendored_frameworks = 'onnxruntime.xcframework'
  s.static_framework    = true
  s.weak_frameworks     = 'CoreML'
  s.source_files        = 'Headers/*.h'
  s.preserve_paths      = 'LICENSE'
  s.libraries           = 'c++'
  s.pod_target_xcconfig = { 'OTHER_CPLUSPLUSFLAGS' => '-fvisibility=hidden -fvisibility-inlines-hidden' }
end
