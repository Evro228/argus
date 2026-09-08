/**
 * electron-builder afterPack hook.
 *
 * Problem: When building without an Apple Developer ID certificate
 * (CSC_IDENTITY_AUTO_DISCOVERY=false / identity: null), electron-builder
 * leaves Electron framework binaries with broken "adhoc,linker-signed"
 * signatures. macOS Gatekeeper sees "code has no resources but signature
 * indicates they must be present" → marks the app as "damaged".
 *
 * Fix: After electron-builder packs the .app bundle but BEFORE it creates
 * the DMG, we re-sign every Mach-O binary and framework inside the bundle
 * with a proper ad-hoc signature using `codesign --force --deep -s -`.
 * This produces valid ad-hoc signatures that pass `codesign --verify`.
 *
 * Users still need to run `xattr -cr` after downloading (because there is
 * no Apple notarization), but the app will no longer be reported as "damaged".
 */

const { execSync } = require("child_process");
const path = require("path");

exports.default = async function (context) {
  // Only run on macOS builds
  if (process.platform !== "darwin") return;

  const appPath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`
  );

  console.log(`[fix-macos-sign] Re-signing: ${appPath}`);

  try {
    // Step 1: Strip all existing broken signatures recursively
    execSync(`find "${appPath}" -type f -perm +111 -exec codesign --remove-signature {} \\; 2>/dev/null || true`, {
      stdio: "inherit",
    });

    // Step 2: Sign all frameworks and helpers from inside out
    const frameworks = path.join(appPath, "Contents", "Frameworks");
    
    // Sign each helper app
    const helpers = [
      "ARGUS Helper.app",
      "ARGUS Helper (GPU).app",
      "ARGUS Helper (Plugin).app",
      "ARGUS Helper (Renderer).app",
    ];
    for (const helper of helpers) {
      const helperPath = path.join(frameworks, helper);
      try {
        execSync(`codesign --force --deep -s - "${helperPath}" 2>/dev/null`, {
          stdio: "inherit",
        });
      } catch (_) {
        // Helper may not exist in this Electron version
      }
    }

    // Sign Electron Framework
    try {
      execSync(
        `codesign --force --deep -s - "${path.join(frameworks, "Electron Framework.framework")}"`,
        { stdio: "inherit" }
      );
    } catch (_) {}

    // Step 3: Sign the top-level app bundle (covers everything)
    execSync(`codesign --force --deep -s - "${appPath}"`, {
      stdio: "inherit",
    });

    // Step 4: Verify
    execSync(`codesign --verify --deep --strict "${appPath}"`, {
      stdio: "inherit",
    });

    console.log("[fix-macos-sign] ✅ Ad-hoc re-signing successful — codesign --verify passed");
  } catch (err) {
    console.error("[fix-macos-sign] ❌ Re-signing failed:", err.message);
    // Don't fail the build — the app might still work with xattr -cr
  }
};
