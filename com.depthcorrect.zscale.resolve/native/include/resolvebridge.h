// ResolveBridge — native C++ bridge for the DepthCorrect DaVinci Resolve plugin.
//
// Exposes the minimal Blackmagic Resolve SDK surface that the JavaScript layer
// depends on:
//   WorkflowIntegration.Initialize(pluginId) -> bool
//   WorkflowIntegration.GetResolve() -> Resolve object
//     Resolve.Fusion() -> Fusion object
//       Fusion.GetCurrentComp() -> FusionComp object
//         FusionComp.GetToolList(selectedOnly) -> { name: tool }
//         FusionComp.StartUndo(label) / EndUndo(apply)
//         FusionComp.CurrentTime -> number
//         tool.GetAttrs() -> { TOOLS_Name, TOOLS_RegID, ... }
//         tool.GetData(key) -> string
//         tool.SetData(key, value)
//         tool.GetInput(name, time) -> value
//         tool.SetInput(name, value, time)
//         tool.FindInput(name) -> input object
//         input.SetExpression(expr) -> bool

#pragma once

#include <node.h>
#include <v8.h>

namespace depthcorrect {

class ResolveBridge {
public:
    static void Initialize(const v8::FunctionCallbackInfo<v8::Value>& args);
    static void GetResolve(const v8::FunctionCallbackInfo<v8::Value>& args);
    static void New(const v8::FunctionCallbackInfo<v8::Value>& args);

    static void SetInstance(void* instance) { instance_ = instance; }
    static void* Instance() { return instance_; }

private:
    static void* instance_;
};

}  // namespace depthcorrect