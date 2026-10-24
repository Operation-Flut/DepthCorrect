# CMake build for the DepthCorrect Resolve native bridge.
#
# Usage:
#   mkdir build && cd build
#   cmake -G "Visual Studio 17 2022" -A x64 ..
#   cmake --build . --config Release
#
#   # macOS / Linux
#   cmake -DCMAKE_BUILD_TYPE=Release ..
#   cmake --build .

cmake_minimum_required(VERSION 3.16)
project(WorkflowIntegration LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release)
endif()

# Find Node.js headers via node-gyp or NODE_PREFIX.
find_package(NodeJS QUIET)

if(NOT NODEJS_INCLUDE_DIR)
    execute_process(
        COMMAND node -e "process.stdout.write(process.release.headersDir || '')"
        OUTPUT_VARIABLE NODE_HEADERS
        OUTPUT_STRIP_TRAILING_WHITESPACE
    )
    if(NODE_HEADERS)
        set(NODEJS_INCLUDE_DIR "${NODE_HEADERS}")
    endif()
endif()

if(NOT NODEJS_INCLUDE_DIR)
    message(FATAL_ERROR "Node.js headers not found. Install node development headers (npm install -g node-gyp).")
endif()

include_directories(${CMAKE_CURRENT_SOURCE_DIR}/include ${NODEJS_INCLUDE_DIR})

add_library(WorkflowIntegration SHARED
    src/resolvebridge.cpp
)

set_target_properties(WorkflowIntegration PROPERTIES
    PREFIX ""
    SUFFIX ".node"
    OUTPUT_NAME WorkflowIntegration
)

if(WIN32)
    target_compile_definitions(WorkflowIntegration PRIVATE NOMINMAX WIN32_LEAN_AND_MEAN)
    target_link_libraries(WorkflowIntegration PRIVATE ws2_32)
elseif(APPLE)
    set_target_properties(WorkflowIntegration PROPERTIES
        CXX_FLAGS "-fPIC -std=++17"
    )
    target_link_libraries(WorkflowIntegration PRIVATE
        "-framework Foundation"
    )
elseif(UNIX)
    target_compile_options(WorkflowIntegration PRIVATE -fPIC)
endif()