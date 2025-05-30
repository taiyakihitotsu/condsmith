import {
  Project,
  SyntaxKind,
  TypeNode,
  TypeLiteralNode,
  PropertySignature,
  ArrayTypeNode,
  TupleTypeNode,
} from "ts-morph";
import path from "path";
import { promises as fs } from "fs";

const dirPath = process.argv[2];
if (!dirPath) {
  console.error("please input a dir path");
  process.exit(1);
}

const formatOneFile = (filePath: string) => {
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(filePath);

  const indent = "  ";
  const space = " ";

  const formatTypeLiteral = (
    typeLiteral: TypeLiteralNode,
    depth: number,
    namelen: number = 0,
    mapDepth: number = 0,
  ): string => {
    const members = typeLiteral
      .getMembers()
      .filter(
        (m) => m.getKind() === SyntaxKind.PropertySignature,
      ) as PropertySignature[];

    if (members.length === 0) return "{}";

    let formatted = "{";

    members.forEach((member, index) => {
      const name = member.getName();
      const memberTypeNode = member.getTypeNode();
      const nameLength = member.getNameNode().getText().length;
      const typeText = memberTypeNode
        ? memberTypeNode.getKind() === SyntaxKind.TypeLiteral
          ? formatTypeLiteral(
              memberTypeNode.asKindOrThrow(SyntaxKind.TypeLiteral),
              depth,
              nameLength +
                (namelen === 0 ? 0 : namelen + (mapDepth > 0 ? 4 : 3)),
              mapDepth + 1,
            )
          : memberTypeNode.getText()
        : "any";

      const prefix =
        index === 0
          ? " "
          : `\n${namelen > 1 ? space.repeat(namelen) : ""}${indent.repeat(depth + 1)}, `;
      formatted += `${prefix}${name}: ${typeText}`;
    });

    formatted += " }";

    return formatted;
  };

  const formatCondType = (
    typeNode: TypeNode,
    depth: number = 1,
    ftof: number = 0,
  ): string => {
    if (typeNode.getKind() === SyntaxKind.ConditionalType) {
      const condType = typeNode.asKindOrThrow(SyntaxKind.ConditionalType);

      const condition =
        condType.getCheckType().getText() +
        " extends " +
        condType.getExtendsType().getText();
      const trueType = formatCondType(condType.getTrueType(), depth + 1);
      const falseType = formatCondType(condType.getFalseType(), depth, 1);

      return `${depth === 1 && ftof === 0 ? indent : ""}${condition}\n${indent.repeat(depth + 1)}? ${trueType}\n${indent.repeat(depth)}: ${falseType}`;
    }
    if (typeNode.getKind() === SyntaxKind.TypeLiteral) {
      return formatTypeLiteral(
        typeNode.asKindOrThrow(SyntaxKind.TypeLiteral),
        depth,
        ftof,
      );
    }
    return typeNode.getText();
  };
  sourceFile.getTypeAliases().forEach((alias) => {
    if (alias.getStartLineNumber() === alias.getEndLineNumber()) return;

    const typeParams = alias.getTypeParameters().map((p) => p.getText());
    const nameNode = alias.getNameNode();

    const typeName = alias.getName();
    const exportModifier = alias.isDefaultExport()
      ? "export default "
      : alias.hasExportKeyword()
        ? "export "
        : "";

    let formattedParams = "";
    if (typeParams.length > 0) {
      formattedParams = "<\n  " + typeParams.join("\n, ") + ">";
    }

    const typeNode = alias.getTypeNodeOrThrow();

    const formattedType = formatCondType(typeNode);

    const fullTypeAlias = `${exportModifier}type ${typeName}${formattedParams} =\n${formattedType}`;
    alias.replaceWithText(fullTypeAlias);
  });

  sourceFile.saveSync();

  console.log(`format is done > ${filePath}`);
};

const findTsFiles = async (dir: string): Promise<string[]> => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await findTsFiles(fullPath);
      results.push(...nested);
    } else if (entry.isFile() && /\.(ts|d\.ts|tsx)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }

  return results;
};

const run = async (): Promise<void> => {
  try {
    const files = await findTsFiles(dirPath);
    await Promise.all(files.map(formatOneFile));
    console.log("all is done well.");
  } catch (err) {
    console.error("error:", err);
  }
};

run();
