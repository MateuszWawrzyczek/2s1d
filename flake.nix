{
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "aarch64-darwin"
        "x86_64-linux"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      devShells = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          default = pkgs.mkShellNoCC {
            packages = with pkgs; [
              nodejs
              corepack
            ];

            shellHook = ''
              export PATH=$PWD/node_modules/.bin:$PATH
              echo "pz-worker dev shell"
              echo "  node:  $(node --version)"
              echo "  pnpm:  $(pnpm --version)"
              echo ""
              echo "  pnpm run dev    # start worker"
            '';
          };
        }
      );
    };
}
