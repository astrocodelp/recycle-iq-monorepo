# onnxruntime-c 1.24.3 (local pod)

Workaround for the official pod's download host (`download.onnxruntime.ai`), which currently serves a
certificate for `*.azureedge.net` and fails TLS verification on EAS.

`pod-archive-onnxruntime-c-1.24.3.zip` = Microsoft's own iOS build from the NuGet package
`Microsoft.ML.OnnxRuntime` 1.24.3 (`runtimes/ios/native/onnxruntime.xcframework.zip`), with:

- `onnxruntime.xcframework/` (ios-arm64 and ios-arm64_x86_64-simulator; the Mac Catalyst slice removed),
- `Headers/` = the framework's headers (same set as the official pod),
- `LICENSE` (MIT) from the package.

The plugin `plugins/with-onnxruntime-local-pod.js` points the Podfile at `onnxruntime-c.podspec` here.
To rebuild: download the `.nupkg` from api.nuget.org, unzip the xcframework, drop the maccatalyst slice
from the folder and from `Info.plist`, copy the headers to `Headers/`, zip, and update the sha256.
