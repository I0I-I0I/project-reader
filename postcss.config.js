import postcssGlobalData from "@csstools/postcss-global-data"
import postcssCustomMedia from "postcss-custom-media"

export default {
    plugins: [
        postcssGlobalData({
            files: ["./src/lib/styles/custom-media.css"],
        }),
        postcssCustomMedia(),
    ],
}
