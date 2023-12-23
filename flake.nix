{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };
  outputs = { nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
        python-pkgs = ps: with ps; [
          jieba
          wordcloud
          (
            buildPythonPackage rec {
              pname = "pixivpy3";
              version = "3.7.4";
              src = fetchPypi {
                inherit pname version;
                sha256 = "sha256-JBW0XYioyzHDGwwHilkJ6ji6JSGuanLSWlPEeZ+Vb34=";
              };
              doCheck = false;
              format = "pyproject";
              propagatedBuildInputs = [ poetry-core cloudscraper ];
            }
          )
          requests
        ];
      in
      {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            fish
            deno
            (pkgs.python3.withPackages python-pkgs)
          ];

          shellHook = ''
            exec fish
          '';
        };
      });
}
