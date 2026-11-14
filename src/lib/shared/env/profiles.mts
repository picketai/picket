export type RuntimeProfile = {
  name: string;
  markers: string[];
  claims: (markerText: string) => boolean;
  isService: (markerText: string) => boolean;
  linux: boolean;
  dockerfileStep: string | null;
  variableFor: (key: string) => string;
};

const FRAMEWORK_PROJECT = /<TargetFrameworkVersion>/i;
const WEB_SDK = /Sdk\s*=\s*"Microsoft\.NET\.Sdk\.Web"/i;
const EXECUTABLE = /<OutputType>\s*(?:Exe|WinExe)\s*<\/OutputType>/i;

const always = (): boolean => true;

export function upperSnake(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

export function dotnetVariable(key: string): string {
  return key.replaceAll(":", "__");
}

function userRow(name: string, markers: string[]): RuntimeProfile {
  return { name, markers, claims: always, isService: always, linux: true, dockerfileStep: null, variableFor: upperSnake };
}

export const PROFILES: readonly RuntimeProfile[] = [
  {
    name: "dotnet-framework",
    markers: ["*.csproj"],
    claims: (text) => FRAMEWORK_PROJECT.test(text),
    isService: always,
    linux: false,
    dockerfileStep: null,
    variableFor: dotnetVariable,
  },
  {
    name: "dotnet",
    markers: ["*.csproj"],
    claims: always,
    isService: (text) => WEB_SDK.test(text) || EXECUTABLE.test(text),
    linux: true,
    dockerfileStep: "a multi-stage Dockerfile that publishes with the .NET SDK image and runs on the ASP.NET runtime image, both pinned by digest",
    variableFor: dotnetVariable,
  },
  {
    name: "node",
    markers: ["package.json"],
    claims: always,
    isService: always,
    linux: true,
    dockerfileStep: "a Dockerfile on a Node.js LTS alpine image pinned by digest that installs production dependencies and runs the start script",
    variableFor: upperSnake,
  },
  userRow("go", ["go.mod"]),
  userRow("java", ["pom.xml", "build.gradle", "build.gradle.kts"]),
  userRow("python", ["pyproject.toml", "requirements.txt", "setup.py"]),
  userRow("rust", ["Cargo.toml"]),
  userRow("ruby", ["Gemfile"]),
  userRow("php", ["composer.json"]),
  userRow("container", ["Dockerfile"]),
];

export function matchesMarker(fileName: string, marker: string): boolean {
  return marker.startsWith("*") ? fileName.toLowerCase().endsWith(marker.slice(1).toLowerCase()) : fileName === marker;
}

export type ProfileMatch = { profile: RuntimeProfile; marker: string };

export function profileFor(fileNames: string[], readMarker: (fileName: string) => string): ProfileMatch | null {
  const sorted = [...fileNames].sort();
  for (const profile of PROFILES) {
    for (const marker of sorted.filter((name) => profile.markers.some((pattern) => matchesMarker(name, pattern)))) {
      if (profile.claims(readMarker(marker))) return { profile, marker };
    }
  }
  return null;
}
