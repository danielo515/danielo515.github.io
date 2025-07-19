{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    # Node.js
    nodejs_20
    
    # Package manager
    nodePackages.pnpm
  ];

  shellHook = ''
    echo "Nix development environment loaded with pnpm"
    # Set up any environment variables needed for pnpm
    export PNPM_HOME="$HOME/.local/share/pnpm"
    export PATH="$PNPM_HOME:$PATH"
  '';
}
