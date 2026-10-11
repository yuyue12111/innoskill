import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/", "src/generated/"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // 06:禁用 class + 继承实现多态,统一用 interface + 工厂函数
    files: ["src/**/*.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        { selector: "ClassDeclaration", message: "用 interface + 工厂函数,不写 class(见 CLAUDE.md)" },
        { selector: "ClassExpression", message: "用 interface + 工厂函数,不写 class(见 CLAUDE.md)" },
      ],
    },
  },
);
