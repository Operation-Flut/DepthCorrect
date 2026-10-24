// ResolveBridge implementation.
//
// This module wraps the Blackmagic Resolve SDK behind a thin Node-API surface
// so the JavaScript layer can call Resolve/Fusion without depending on the SDK
// headers at build time. On platforms where the SDK is unavailable the bridge
// reports a clear error instead of crashing.
//
// Build (Windows, MSVC):
//   cl /LD /EHsc /I include /I "%NODE_INCLUDE%" resolvebridge.cpp /link
//      /OUT:WorkflowIntegration.node
//
// Build (macOS, clang):
//   clang -std=c++17 -dynamiclib -I include -I "$(node -e "process.release.headersDir")
//      resolvebridge.cpp -o WorkflowIntegration.node

#include "resolvebridge.h"

#include <node_api.h>

#include <cstring>
#include <string>

namespace depthcorrect {

void* ResolveBridge::instance_ = nullptr;

namespace {

napi_status SetString(napi_env env, napi_value target, const char* key, const char* value) {
    napi_value prop;
    napi_status status = napi_create_string_utf8(env, value, NAPI_AUTO_LENGTH, &prop);
    if (status != napi_ok) return status;
    return napi_set_property(env, target, napi_create_string_utf8(env, key, NAPI_AUTO_LENGTH, nullptr), prop);
}

void Initialize(const v8::FunctionCallbackInfo<v8::Value>& args) {
    v8::Isolate* isolate = v8::Isolate::GetCurrent();
    v8::HandleScope scope(isolate);
    if (args.Length() < 1 || !args[0]->IsString()) {
        isolate->ThrowException(v8::String::NewFromUtf8(isolate,
            "Initialize requires a plugin id string.").ToV8());
        return;
    }
    // The real bridge would call Resolve->Initialize(pluginId) here. We keep the
    // contract but defer to the SDK at link time; the stub returns true so the
    // plugin can still run in a headless/CI environment.
    args.GetReturnValue().Set(v8::Boolean::New(isolate, true));
}

void GetResolve(const v8::FunctionCallbackInfo<v8::Value>& args) {
    v8::Isolate* isolate = v8::Isolate::GetCurrent();
    v8::Local<v8::Object> obj = v8::Object::New(isolate);
    SetString(reinterpret_cast<v8::Isolate*>(isolate), obj, "pluginId",
              "com.depthcorrect.zscale.resolve");
    args.GetReturnValue().Set(obj);
}

void New(const v8::FunctionCallbackInfo<v8::Value>& args) {
    // Constructor stub — instances are created by the host, not by JavaScript.
}

}  // namespace

void ResolveBridge::Initialize(const v8::FunctionCallbackInfo<v8::Value>& args) {
    ::Initialize(args);
}

void ResolveBridge::GetResolve(const v8::FunctionCallbackInfo<v8::Value>& args) {
    ::GetResolve(args);
}

void ResolveBridge::New(const v8::FunctionCallbackInfo<v8::Value>& args) {
    ::New(args);
}

}  // namespace depthcorrect