import { resolve } from "path"
import { defineConfig } from "vite"
import solidPlugin from "vite-plugin-solid"
import Icons from "unplugin-icons/vite"

export default defineConfig({
    plugins: [
        /*
        Uncomment the following line to enable solid-devtools.
        For more info see https://github.com/thetarnav/solid-devtools/tree/main/packages/extension#readme
        */
        // devtools(),
        solidPlugin(),
        Icons({ compiler: "jsx", jsx: "preact", autoInstall: true }),
    ],
    server: {
        port: 3000,
    },
    build: {
        target: "esnext",
        rollupOptions: {
            input: {
                main: resolve(__dirname, "index.html"),
                // texTool: resolve(__dirname, "tex-tool.html"),
            },
        },
    },
    assetsInclude: ["**/*.tex"],
})
