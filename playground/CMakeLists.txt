cmake_minimum_required(VERSION 3.16)
project(CoolingECU C)

set(CMAKE_C_STANDARD 99)
set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -Wall -Wextra -g -O0 -Wno-unused-variable -Wno-unused-parameter")

# Collect all source files
file(GLOB_RECURSE SOURCES
    "${CMAKE_SOURCE_DIR}/main.c"
    "${CMAKE_SOURCE_DIR}/platform/*.c"
    "${CMAKE_SOURCE_DIR}/mcal/*.c"
    "${CMAKE_SOURCE_DIR}/ecual/*.c"
    "${CMAKE_SOURCE_DIR}/services/*.c"
    "${CMAKE_SOURCE_DIR}/rte/*.c"
    "${CMAKE_SOURCE_DIR}/app/*.c"
    "${CMAKE_SOURCE_DIR}/utils/*.c"
)

# Include directories
include_directories(${CMAKE_SOURCE_DIR})

# Main executable
add_executable(cooling_ecu ${SOURCES})
