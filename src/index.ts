import {
  Node,
  Project,
  SyntaxKind,
  TypeNode,
  TypeLiteralNode,
  PropertySignature,
} from "ts-morph";
import path from "path";
import { promises as fs } from "fs";

const indent = "  ";
const space = " ";

const dirPath = process.argv[2];
if (!dirPath) {
  console.error("please input a dir path");
  process.exit(1);
}

const getTypeText = (
  member: PropertySignature,
  depth: number,
  namelen: number,
  mapDepth: number,
): string => {
  const nameLength = member.getNameNode().getText().length;

  const _typeNode = member.getTypeNode();
  if (!_typeNode) return member.getType().getText();
  if (_typeNode.getKind() === SyntaxKind.TypeLiteral) {
    const typeNode = _typeNode.asKindOrThrow(SyntaxKind.TypeLiteral);
    //      const typeNode = member.getTypeNode()?.asKindOrThrow(SyntaxKind.TypeLiteral);
    return formatTypeLiteral(
      typeNode,
      depth,
      nameLength + (namelen === 0 ? 0 : namelen + (mapDepth > 0 ? 4 : 3)),
      mapDepth + 1,
    );
  } else {
    return member.getType().getText();
  }
};

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
    const typeText = getTypeText(member, depth, namelen, mapDepth);

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

const formatOneFile = (filePath: string) => {
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(filePath);

  const extractTypeLiteralFromModule = (node: Node): TypeNode | undefined => {
    if (node.getKind() !== SyntaxKind.ModuleDeclaration) return undefined;

    const moduleDecl = node.asKindOrThrow(SyntaxKind.ModuleDeclaration);
    const body = moduleDecl.getBody();
    if (!body) return undefined;

    if (body.getKind() === SyntaxKind.ModuleBlock) {
      const moduleBlock = body.asKindOrThrow(SyntaxKind.ModuleBlock);
      const typeAlias = moduleBlock
        .getStatements()
        .find((stmt) => stmt.getKind() === SyntaxKind.TypeAliasDeclaration);
      if (!typeAlias) return undefined;
      const typeNode = typeAlias
        .asKindOrThrow(SyntaxKind.TypeAliasDeclaration)
        .getTypeNode();
      if (typeNode && typeNode.getKind() === SyntaxKind.TypeLiteral)
        return typeNode;
    } else if (body.getKind() === SyntaxKind.ModuleDeclaration) {
      return extractTypeLiteralFromModule(body);
    }

    return undefined;
  };

  sourceFile
    .getDescendantsOfKind(SyntaxKind.TypeAliasDeclaration)
    .forEach((alias) => {
      if (alias.getStartLineNumber() === alias.getEndLineNumber()) return;

      const typeParams = alias.getTypeParameters().map((p) => p.getText());

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
    console.log("morphing is done.");
  } catch (err) {
    console.error("error:", err);
  }
};

run();
