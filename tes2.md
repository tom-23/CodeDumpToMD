#CodeDump 
##CMakeLists.txt
```txt
file(GLOB horizon_SOURCES main.cpp horizon.cpp app/*.cpp app/audio_effects/*.cpp common/*.cpp gui/*.cpp gui/audio_effects/*.cpp gui/ui_controls/*.cpp network/*.cpp)

file(GLOB horizon_HEADERS app/*.h app/audio_effects/*.h common/*.h gui/*.h gui/audio_effects/*.h gui/ui_controls/*.h network/*.h)

file(GLOB horizon_DARWIN_SOURCES common/darwin/*.m common/darwin/*.h common/darwin/*.cpp)

file(GLOB horizon_FORMS gui/*.ui gui/audio_effects/*.ui
    )
set(horizon_RESOURCES ../misc/assets/resources.qrc ../misc/assets/core.qrc
                      ../misc/assets/themes.qrc)

include_directories(${CMAKE_CURRENT_BINARY_DIR} .)
include_directories(${Qt5Widgets_INCLUDES})
include_directories("../lib/LabSound/include")
add_definitions(${Qt5Widgets_DEFINITIONS})

qt5_wrap_ui(horizon_FORMS_HEADERS ${horizon_FORMS})
qt5_add_resources(horizon_RESOURCES_RCC ${horizon_RESOURCES})

set(EXECUTABLE_OUTPUT_PATH ${PROJECT_BINARY_DIR})

set(horizon_COMPILE
    ${horizon_COMPILE} ${horizon_SOURCES} ${horizon_HEADERS} ${horizon_FORMS_HEADERS}
    ${horizon_RESOURCES_RCC} ${horizon_QM})

if(NOT APPLE)
  add_executable(${HORIZON_EXECUTABLE_NAME} ${horizon_COMPILE})
else()
  list(APPEND horizon_COMPILE ${horizon_DARWIN_SOURCES})
  # On Macs we must ensure the required frameworks are linked
  find_library(AUDIOUNITS_LIBRARY "AudioUnit")
  find_library(AUDIOTOOLBOX_LIBRARY "AudioToolbox")
  find_library(ACCELERATE_LIBRARY "Accelerate")
  find_library(COCOA_LIBRARY "Cocoa")
  find_library(COREAUDIO_LIBRARY "CoreAudio")
  find_library(CORESERVICES_LIBRARY "CoreServices")

  mark_as_advanced(AUDIOUNITS_LIBRARY AUDIOTOOLBOX_LIBRARY ACCELERATE_LIBRARY
                   COCOA_LIBRARY COREAUDIO_LIBRARY CORESERVICES_LIBRARY)
  list(
    APPEND
    horizon_LIBRARIES
    "${AUDIOUNITS_LIBRARY}"
    "${AUDIOTOOLBOX_LIBRARY}"
    "${ACCELERATE_LIBRARY}"
    "${COCOA_LIBRARY}"
    "${COREAUDIO_LIBRARY}"
    "${CORESERVICES_LIBRARY}")

  set(HORIZON_VERSION_REGEX "^v([0-9]+)\.([0-9]+)\.(.*)$")
  string(REGEX REPLACE "${HORIZON_VERSION_REGEX}" "\\1"
                       CPACK_PACKAGE_VERSION_MAJOR "${horizon_version}")
  string(REGEX REPLACE "${HORIZON_VERSION_REGEX}" "\\2"
                       CPACK_PACKAGE_VERSION_MINOR "${horizon_version}")
  string(REGEX REPLACE "${HORIZON_VERSION_REGEX}" "\\3"
                       CPACK_PACKAGE_VERSION_PATCH "${horizon_version}")

  set(MACOSX_BUNDLE_BUNDLE_NAME "${HORIZON_EXECUTABLE_NAME}")
  set(MACOSX_BUNDLE_GUI_IDENTIFIER "com.horizon-daw.horizon")
  set(MACOSX_BUNDLE_INFO_STRING "Horizon Digital Audio Workstation")
  set(MACOSX_BUNDLE_ICON_FILE "Horizon.icns")
  set(MACOSX_BUNDLE_LONG_VERSION_STRING "${horizon_version}")
  set(MACOSX_BUNDLE_SHORT_VERSION_STRING
      "${CPACK_PACKAGE_VERSION_MAJOR}.${CPACK_PACKAGE_VERSION_MINOR}")
  set(MACOSX_BUNDLE_BUNDLE_VERSION "${horizon_version}")

  set_source_files_properties(
    "${CMAKE_CURRENT_SOURCE_DIR}/../misc/assets/app_icon/Horizon.icns"
    PROPERTIES MACOSX_PACKAGE_LOCATION Resources)
  set(horizon_COMPILE ${horizon_COMPILE}
                      "${CMAKE_CURRENT_SOURCE_DIR}/../misc/assets/app_icon/Horizon.icns")

  add_executable(${HORIZON_EXECUTABLE_NAME} MACOSX_BUNDLE ${horizon_COMPILE})
endif()

add_dependencies(${HORIZON_EXECUTABLE_NAME} generate_version_header)

# Qt modules
list(APPEND horizon_qt_modules "WebSockets" "WebEngine" "WebEngineWidgets")
foreach(horizon_qt_module ${horizon_qt_modules})
  message(STATUS "Finding QT Plugin ${horizon_qt_module}")
  find_package(Qt5${horizon_qt_module} REQUIRED)
  list(APPEND horizon_LIBRARIES Qt5::${horizon_qt_module})
endforeach()

# LabSound
list(APPEND horizon_LIBRARIES LabSound)

# libnyquist
list(APPEND horizon_LIBRARIES libnyquist)

# libwavpack
list(APPEND horizon_LIBRARIES libwavpack)

set_target_properties(${HORIZON_EXECUTABLE_NAME} PROPERTIES COMPILE_DEFINITIONS "${horizon_DEFINITIONS}")

set_target_properties(${HORIZON_EXECUTABLE_NAME} PROPERTIES LINK_FLAGS "${horizon_LINK_FLAGS}")

foreach(module ${horizon_LIBRARIES})
  message(STATUS "Target link module ${module}")
endforeach()

target_link_libraries(${HORIZON_EXECUTABLE_NAME} ${horizon_LIBRARIES})

install(TARGETS ${HORIZON_EXECUTABLE_NAME}
    BUNDLE DESTINATION . COMPONENT Runtime
    RUNTIME DESTINATION bin COMPONENT Runtime
    )

if (NOT APPLE)

else()
    set_target_properties(${HORIZON_EXECUTABLE_NAME} PROPERTIES MACOSX_BUNDLE_INFO_PLIST "${CMAKE_CURRENT_SOURCE_DIR}/../shared/Info.plist")

    set(qtconf_dest_dir "${HORIZON_EXECUTABLE_NAME}.app/Contents/Resources")

    macro(install_qt5_plugin _qt_plugin_name _qt_plugins_var)
        get_target_property(_qt_plugin_path "${_qt_plugin_name}" LOCATION)
        if(EXISTS "${_qt_plugin_path}")
            get_filename_component(_qt_plugin_file "${_qt_plugin_path}" NAME)
            get_filename_component(_qt_plugin_type "${_qt_plugin_path}" PATH)
            get_filename_component(_qt_plugin_type "${_qt_plugin_type}" NAME)
            set(_qt_plugin_dest "${plugin_dest_dir}/${_qt_plugin_type}")
            install(FILES "${_qt_plugin_path}" DESTINATION "${_qt_plugin_dest}" COMPONENT Runtime)
            set(${_qt_plugins_var}
                "${${_qt_plugins_var}};\$ENV{DESTDIR}\${CMAKE_INSTALL_PREFIX}/${_qt_plugin_dest}/${_qt_plugin_file}")
        else()
            message(FATAL_ERROR "QT plugin ${_qt_plugin_name} not found")
        endif()
    endmacro()

    # Install needed Qt plugins

    foreach(_horizon_qt_module ${horizon_qt_modules} "Gui" "Widgets" "SVG" "WebSockets" "WebEngineCore" "WebEngineWidgets")
        set(_module_plugins "${Qt5${_horizon_qt_module}_PLUGINS}")
        foreach(_plugin ${_module_plugins})
            message(STATUS "Installing QT Plugin ${_plugin}")
            install_qt5_plugin("${_plugin}" FIXUP_BUNDLE_QT_PLUGINS)
        endforeach()
    endforeach()


    # install a qt.conf file
    # this inserts some cmake code into the install script to write the file
    install(CODE "
        file(WRITE \"\${CMAKE_INSTALL_PREFIX}/${qtconf_dest_dir}/qt.conf\" \"[Paths]\nPlugins = PlugIns\nImports = Resources/qml\nQml2Imports = Resources/qml\n\")
        "
        COMPONENT Runtime
        )

    set(FIXUP_BUNDLE_APPS "\${CMAKE_INSTALL_PREFIX}/${HORIZON_EXECUTABLE_NAME}.app")

    get_property(_horizon_installed_plugins GLOBAL PROPERTY HORIZON_INSTALLED_PLUGINS)

    # Directories to look for dependencies
    set(FIXUP_BUNDLE_DEP_DIRS "${CMAKE_BINARY_DIR};${QT_LIBRARY_DIRS}")

    # Get reference to deployqt
    get_target_property(uic_location Qt5::uic IMPORTED_LOCATION)
    get_filename_component( _dir ${uic_location} DIRECTORY)
    set(deployqt "${_dir}/macdeployqt")
    if(NOT EXISTS ${deployqt})
      message(FATAL_ERROR "Failed to locate deployqt executable: [${deployqt}]")
    endif()

    # Execute deployqt during package creation
    # See https://doc.qt.io/qt-5/osx-deployment.html#macdeploy
    install(CODE "set(deployqt \"${deployqt}\")" COMPONENT Runtime)
    install(CODE [===[
    execute_process(COMMAND "${deployqt}" "${CMAKE_INSTALL_PREFIX}/Horizon.app")
    ]===] COMPONENT Runtime)

    install(CODE "
        include(BundleUtilities)
        set(BU_CHMOD_BUNDLE_ITEMS ON)
        fixup_bundle(\"${FIXUP_BUNDLE_APPS}\" \"${FIXUP_BUNDLE_QT_PLUGINS};${_horizon_installed_plugins}\" \"${FIXUP_BUNDLE_DEP_DIRS}\")
        verify_app(\"${FIXUP_BUNDLE_APPS}\")
        "
        COMPONENT Runtime
        )

    set(CPACK_GENERATOR "DragNDrop")
    include(CPack)
endif()
```

##Horizon.cpp
```cpp
#include <QApplication>
#include <QFileOpenEvent>
#include <QtDebug>
#include "gui/splashscreen.h"
#include "gui/mainwindow.h"
#include "common/debug.h"
#include "common/util.h"
#include "common/preferences.h"

class Horizon : public QApplication
{
public:

    Horizon(int &argc, char **argv) : QApplication(argc, argv) {

        this->instance();
        this->setAttribute(Qt::AA_UseHighDpiPixmaps);

        debug::setDebugLevel(3);
        debug::out(3, "Horizon Digital Audio Workstation");

        debug::out(3, "Loading fonts...");

        QFontDatabase::addApplicationFont(":/fonts/fonts/Rublik/Rubik-Regular.ttf");
        QFontDatabase::addApplicationFont(":/fonts/fonts/Rublik/Rubik-Medium.ttf");
        QFontDatabase::addApplicationFont(":/fonts/fonts/Rublik/Rubik-MediumItalic.ttf");
        QFontDatabase::addApplicationFont(":/fonts/fonts/Rublik/Rubik-Bold.ttf");
        QFontDatabase::addApplicationFont(":/fonts/fonts/Rublik/Rubik-Italic.ttf");

        debug::out(3, "Showing Splash...");

        SplashScreen *splashScreen = new SplashScreen();
        splashScreen->setWindowFlags(Qt::FramelessWindowHint | Qt::WindowStaysOnTopHint);
        splashScreen->show();

        splashScreen->setVersion("1.0.0 alpha");

        splashScreen->setText("Loading Preferences...");

        QString prefsLoc;

        #ifndef _WIN32
        prefsLoc = QString::fromStdString(util::getResourceBundle()) + "/prefs.json";
        #else
        prefsLoc = QString::fromStdString(util::getInstallDir()) + "/prefs.json";
        #endif

        Preferences *prefs = new Preferences(prefsLoc);
        prefs->load();

        debug::out(3, "Loading MainWindow...");
        splashScreen->setText("Loading main window...");

        mainWindow = new MainWindow(nullptr, splashScreen, prefs);
        mainWindow->show();
        this->instance()->exec();
    }

    MainWindow *mainWindow;

    bool event(QEvent *event) override
    {
        if (event->type() == QEvent::FileOpen) {
            QFileOpenEvent *openEvent = static_cast<QFileOpenEvent *>(event);
            debug::out(3, "Recieved input file. Opening...");
            mainWindow->openProject(openEvent->file());
        }

        return QApplication::event(event);
    }
};
```

##cmake_install.cmake
```cmake
# Install script for directory: /Users/tombutcher/Projects/Horizon/src

# Set the install prefix
if(NOT DEFINED CMAKE_INSTALL_PREFIX)
  set(CMAKE_INSTALL_PREFIX "/usr/local")
endif()
string(REGEX REPLACE "/$" "" CMAKE_INSTALL_PREFIX "${CMAKE_INSTALL_PREFIX}")

# Set the install configuration name.
if(NOT DEFINED CMAKE_INSTALL_CONFIG_NAME)
  if(BUILD_TYPE)
    string(REGEX REPLACE "^[^A-Za-z0-9_]+" ""
           CMAKE_INSTALL_CONFIG_NAME "${BUILD_TYPE}")
  else()
    set(CMAKE_INSTALL_CONFIG_NAME "Debug")
  endif()
  message(STATUS "Install configuration: \"${CMAKE_INSTALL_CONFIG_NAME}\"")
endif()

# Set the component getting installed.
if(NOT CMAKE_INSTALL_COMPONENT)
  if(COMPONENT)
    message(STATUS "Install component: \"${COMPONENT}\"")
    set(CMAKE_INSTALL_COMPONENT "${COMPONENT}")
  else()
    set(CMAKE_INSTALL_COMPONENT)
  endif()
endif()

# Is this installation the result of a crosscompile?
if(NOT DEFINED CMAKE_CROSSCOMPILING)
  set(CMAKE_CROSSCOMPILING "FALSE")
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xRuntimex" OR NOT CMAKE_INSTALL_COMPONENT)
  file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/." TYPE DIRECTORY FILES "/Users/tombutcher/Projects/Horizon/Horizon.app" USE_SOURCE_PERMISSIONS)
  if(EXISTS "$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/./Horizon.app/Contents/MacOS/Horizon" AND
     NOT IS_SYMLINK "$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/./Horizon.app/Contents/MacOS/Horizon")
    execute_process(COMMAND /usr/bin/install_name_tool
      -delete_rpath "/Users/tombutcher/Qt/5.14.2/clang_64/lib"
      "$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}/./Horizon.app/Contents/MacOS/Horizon")
  endif()
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xRuntimex" OR NOT CMAKE_INSTALL_COMPONENT)
  list(APPEND CMAKE_ABSOLUTE_DESTINATION_FILES
   "/platforms/libqcocoa.dylib")
  if(CMAKE_WARN_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(WARNING "ABSOLUTE path INSTALL DESTINATION : ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
  if(CMAKE_ERROR_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(FATAL_ERROR "ABSOLUTE path INSTALL DESTINATION forbidden (by caller): ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
file(INSTALL DESTINATION "/platforms" TYPE FILE FILES "/Users/tombutcher/Qt/5.14.2/clang_64/plugins/platforms/libqcocoa.dylib")
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xRuntimex" OR NOT CMAKE_INSTALL_COMPONENT)
  list(APPEND CMAKE_ABSOLUTE_DESTINATION_FILES
   "/imageformats/libqgif.dylib")
  if(CMAKE_WARN_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(WARNING "ABSOLUTE path INSTALL DESTINATION : ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
  if(CMAKE_ERROR_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(FATAL_ERROR "ABSOLUTE path INSTALL DESTINATION forbidden (by caller): ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
file(INSTALL DESTINATION "/imageformats" TYPE FILE FILES "/Users/tombutcher/Qt/5.14.2/clang_64/plugins/imageformats/libqgif.dylib")
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xRuntimex" OR NOT CMAKE_INSTALL_COMPONENT)
  list(APPEND CMAKE_ABSOLUTE_DESTINATION_FILES
   "/imageformats/libqicns.dylib")
  if(CMAKE_WARN_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(WARNING "ABSOLUTE path INSTALL DESTINATION : ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
  if(CMAKE_ERROR_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(FATAL_ERROR "ABSOLUTE path INSTALL DESTINATION forbidden (by caller): ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
file(INSTALL DESTINATION "/imageformats" TYPE FILE FILES "/Users/tombutcher/Qt/5.14.2/clang_64/plugins/imageformats/libqicns.dylib")
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xRuntimex" OR NOT CMAKE_INSTALL_COMPONENT)
  list(APPEND CMAKE_ABSOLUTE_DESTINATION_FILES
   "/imageformats/libqico.dylib")
  if(CMAKE_WARN_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(WARNING "ABSOLUTE path INSTALL DESTINATION : ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
  if(CMAKE_ERROR_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(FATAL_ERROR "ABSOLUTE path INSTALL DESTINATION forbidden (by caller): ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
file(INSTALL DESTINATION "/imageformats" TYPE FILE FILES "/Users/tombutcher/Qt/5.14.2/clang_64/plugins/imageformats/libqico.dylib")
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xRuntimex" OR NOT CMAKE_INSTALL_COMPONENT)
  list(APPEND CMAKE_ABSOLUTE_DESTINATION_FILES
   "/imageformats/libqjpeg.dylib")
  if(CMAKE_WARN_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(WARNING "ABSOLUTE path INSTALL DESTINATION : ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
  if(CMAKE_ERROR_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(FATAL_ERROR "ABSOLUTE path INSTALL DESTINATION forbidden (by caller): ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
file(INSTALL DESTINATION "/imageformats" TYPE FILE FILES "/Users/tombutcher/Qt/5.14.2/clang_64/plugins/imageformats/libqjpeg.dylib")
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xRuntimex" OR NOT CMAKE_INSTALL_COMPONENT)
  list(APPEND CMAKE_ABSOLUTE_DESTINATION_FILES
   "/imageformats/libqmacheif.dylib")
  if(CMAKE_WARN_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(WARNING "ABSOLUTE path INSTALL DESTINATION : ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
  if(CMAKE_ERROR_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(FATAL_ERROR "ABSOLUTE path INSTALL DESTINATION forbidden (by caller): ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
file(INSTALL DESTINATION "/imageformats" TYPE FILE FILES "/Users/tombutcher/Qt/5.14.2/clang_64/plugins/imageformats/libqmacheif.dylib")
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xRuntimex" OR NOT CMAKE_INSTALL_COMPONENT)
  list(APPEND CMAKE_ABSOLUTE_DESTINATION_FILES
   "/imageformats/libqmacjp2.dylib")
  if(CMAKE_WARN_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(WARNING "ABSOLUTE path INSTALL DESTINATION : ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
  if(CMAKE_ERROR_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(FATAL_ERROR "ABSOLUTE path INSTALL DESTINATION forbidden (by caller): ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
file(INSTALL DESTINATION "/imageformats" TYPE FILE FILES "/Users/tombutcher/Qt/5.14.2/clang_64/plugins/imageformats/libqmacjp2.dylib")
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xRuntimex" OR NOT CMAKE_INSTALL_COMPONENT)
  list(APPEND CMAKE_ABSOLUTE_DESTINATION_FILES
   "/platforms/libqminimal.dylib")
  if(CMAKE_WARN_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(WARNING "ABSOLUTE path INSTALL DESTINATION : ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
  if(CMAKE_ERROR_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(FATAL_ERROR "ABSOLUTE path INSTALL DESTINATION forbidden (by caller): ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
file(INSTALL DESTINATION "/platforms" TYPE FILE FILES "/Users/tombutcher/Qt/5.14.2/clang_64/plugins/platforms/libqminimal.dylib")
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xRuntimex" OR NOT CMAKE_INSTALL_COMPONENT)
  list(APPEND CMAKE_ABSOLUTE_DESTINATION_FILES
   "/platforms/libqoffscreen.dylib")
  if(CMAKE_WARN_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(WARNING "ABSOLUTE path INSTALL DESTINATION : ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
  if(CMAKE_ERROR_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(FATAL_ERROR "ABSOLUTE path INSTALL DESTINATION forbidden (by caller): ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
file(INSTALL DESTINATION "/platforms" TYPE FILE FILES "/Users/tombutcher/Qt/5.14.2/clang_64/plugins/platforms/libqoffscreen.dylib")
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xRuntimex" OR NOT CMAKE_INSTALL_COMPONENT)
  list(APPEND CMAKE_ABSOLUTE_DESTINATION_FILES
   "/iconengines/libqsvgicon.dylib")
  if(CMAKE_WARN_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(WARNING "ABSOLUTE path INSTALL DESTINATION : ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
  if(CMAKE_ERROR_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(FATAL_ERROR "ABSOLUTE path INSTALL DESTINATION forbidden (by caller): ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
file(INSTALL DESTINATION "/iconengines" TYPE FILE FILES "/Users/tombutcher/Qt/5.14.2/clang_64/plugins/iconengines/libqsvgicon.dylib")
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xRuntimex" OR NOT CMAKE_INSTALL_COMPONENT)
  list(APPEND CMAKE_ABSOLUTE_DESTINATION_FILES
   "/imageformats/libqsvg.dylib")
  if(CMAKE_WARN_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(WARNING "ABSOLUTE path INSTALL DESTINATION : ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
  if(CMAKE_ERROR_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(FATAL_ERROR "ABSOLUTE path INSTALL DESTINATION forbidden (by caller): ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
file(INSTALL DESTINATION "/imageformats" TYPE FILE FILES "/Users/tombutcher/Qt/5.14.2/clang_64/plugins/imageformats/libqsvg.dylib")
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xRuntimex" OR NOT CMAKE_INSTALL_COMPONENT)
  list(APPEND CMAKE_ABSOLUTE_DESTINATION_FILES
   "/imageformats/libqtga.dylib")
  if(CMAKE_WARN_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(WARNING "ABSOLUTE path INSTALL DESTINATION : ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
  if(CMAKE_ERROR_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(FATAL_ERROR "ABSOLUTE path INSTALL DESTINATION forbidden (by caller): ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
file(INSTALL DESTINATION "/imageformats" TYPE FILE FILES "/Users/tombutcher/Qt/5.14.2/clang_64/plugins/imageformats/libqtga.dylib")
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xRuntimex" OR NOT CMAKE_INSTALL_COMPONENT)
  list(APPEND CMAKE_ABSOLUTE_DESTINATION_FILES
   "/imageformats/libqtiff.dylib")
  if(CMAKE_WARN_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(WARNING "ABSOLUTE path INSTALL DESTINATION : ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
  if(CMAKE_ERROR_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(FATAL_ERROR "ABSOLUTE path INSTALL DESTINATION forbidden (by caller): ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
file(INSTALL DESTINATION "/imageformats" TYPE FILE FILES "/Users/tombutcher/Qt/5.14.2/clang_64/plugins/imageformats/libqtiff.dylib")
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xRuntimex" OR NOT CMAKE_INSTALL_COMPONENT)
  list(APPEND CMAKE_ABSOLUTE_DESTINATION_FILES
   "/generic/libqtuiotouchplugin.dylib")
  if(CMAKE_WARN_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(WARNING "ABSOLUTE path INSTALL DESTINATION : ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
  if(CMAKE_ERROR_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(FATAL_ERROR "ABSOLUTE path INSTALL DESTINATION forbidden (by caller): ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
file(INSTALL DESTINATION "/generic" TYPE FILE FILES "/Users/tombutcher/Qt/5.14.2/clang_64/plugins/generic/libqtuiotouchplugin.dylib")
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xRuntimex" OR NOT CMAKE_INSTALL_COMPONENT)
  list(APPEND CMAKE_ABSOLUTE_DESTINATION_FILES
   "/imageformats/libqwbmp.dylib")
  if(CMAKE_WARN_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(WARNING "ABSOLUTE path INSTALL DESTINATION : ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
  if(CMAKE_ERROR_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(FATAL_ERROR "ABSOLUTE path INSTALL DESTINATION forbidden (by caller): ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
file(INSTALL DESTINATION "/imageformats" TYPE FILE FILES "/Users/tombutcher/Qt/5.14.2/clang_64/plugins/imageformats/libqwbmp.dylib")
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xRuntimex" OR NOT CMAKE_INSTALL_COMPONENT)
  list(APPEND CMAKE_ABSOLUTE_DESTINATION_FILES
   "/imageformats/libqwebp.dylib")
  if(CMAKE_WARN_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(WARNING "ABSOLUTE path INSTALL DESTINATION : ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
  if(CMAKE_ERROR_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(FATAL_ERROR "ABSOLUTE path INSTALL DESTINATION forbidden (by caller): ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
file(INSTALL DESTINATION "/imageformats" TYPE FILE FILES "/Users/tombutcher/Qt/5.14.2/clang_64/plugins/imageformats/libqwebp.dylib")
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xRuntimex" OR NOT CMAKE_INSTALL_COMPONENT)
  list(APPEND CMAKE_ABSOLUTE_DESTINATION_FILES
   "/platformthemes/libqxdgdesktopportal.dylib")
  if(CMAKE_WARN_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(WARNING "ABSOLUTE path INSTALL DESTINATION : ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
  if(CMAKE_ERROR_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(FATAL_ERROR "ABSOLUTE path INSTALL DESTINATION forbidden (by caller): ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
file(INSTALL DESTINATION "/platformthemes" TYPE FILE FILES "/Users/tombutcher/Qt/5.14.2/clang_64/plugins/platformthemes/libqxdgdesktopportal.dylib")
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xRuntimex" OR NOT CMAKE_INSTALL_COMPONENT)
  list(APPEND CMAKE_ABSOLUTE_DESTINATION_FILES
   "/styles/libqmacstyle.dylib")
  if(CMAKE_WARN_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(WARNING "ABSOLUTE path INSTALL DESTINATION : ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
  if(CMAKE_ERROR_ON_ABSOLUTE_INSTALL_DESTINATION)
    message(FATAL_ERROR "ABSOLUTE path INSTALL DESTINATION forbidden (by caller): ${CMAKE_ABSOLUTE_DESTINATION_FILES}")
  endif()
file(INSTALL DESTINATION "/styles" TYPE FILE FILES "/Users/tombutcher/Qt/5.14.2/clang_64/plugins/styles/libqmacstyle.dylib")
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xRuntimex" OR NOT CMAKE_INSTALL_COMPONENT)
  
        file(WRITE "${CMAKE_INSTALL_PREFIX}/Horizon.app/Contents/Resources/qt.conf" "[Paths]
Plugins = PlugIns
Imports = Resources/qml
Qml2Imports = Resources/qml
")
        
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xRuntimex" OR NOT CMAKE_INSTALL_COMPONENT)
  set(deployqt "/Users/tombutcher/Qt/5.14.2/clang_64/bin/macdeployqt")
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xRuntimex" OR NOT CMAKE_INSTALL_COMPONENT)
      execute_process(COMMAND "${deployqt}" "${CMAKE_INSTALL_PREFIX}/Horizon.app")
    
endif()

if("x${CMAKE_INSTALL_COMPONENT}x" STREQUAL "xRuntimex" OR NOT CMAKE_INSTALL_COMPONENT)
  
        include(BundleUtilities)
        set(BU_CHMOD_BUNDLE_ITEMS ON)
        fixup_bundle("${CMAKE_INSTALL_PREFIX}/Horizon.app" ";$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}//platforms/libqcocoa.dylib;$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}//imageformats/libqgif.dylib;$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}//imageformats/libqicns.dylib;$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}//imageformats/libqico.dylib;$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}//imageformats/libqjpeg.dylib;$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}//imageformats/libqmacheif.dylib;$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}//imageformats/libqmacjp2.dylib;$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}//platforms/libqminimal.dylib;$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}//platforms/libqoffscreen.dylib;$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}//iconengines/libqsvgicon.dylib;$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}//imageformats/libqsvg.dylib;$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}//imageformats/libqtga.dylib;$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}//imageformats/libqtiff.dylib;$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}//generic/libqtuiotouchplugin.dylib;$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}//imageformats/libqwbmp.dylib;$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}//imageformats/libqwebp.dylib;$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}//platformthemes/libqxdgdesktopportal.dylib;$ENV{DESTDIR}${CMAKE_INSTALL_PREFIX}//styles/libqmacstyle.dylib;" "/Users/tombutcher/Projects/Horizon;")
        verify_app("${CMAKE_INSTALL_PREFIX}/Horizon.app")
        
endif()

```

##main.cpp
```cpp
#include "Horizon.cpp"

int main(int argc, char *argv[])
{
    Horizon horizonApp(argc, argv);
}
```

