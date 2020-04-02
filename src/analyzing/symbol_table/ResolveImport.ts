import { DuplicateBindingError, InternalError, assert } from '../../errors'
import { FILE_EXTENSION, TARGET_FILE_EXTENSION } from '../../constants'
import { getOutFile, isNotUndefined } from '../../utilities'
import { Analyze } from '../Analyze'
import { Import } from './Import'
import { ImportBinding } from './ImportBinding'
import Parser from 'tree-sitter'
import path from 'path'

export class ResolveImport {
  private analyzer: Analyze
  private file: string

  constructor(analyzer: Analyze, file: string) {
    this.analyzer = analyzer
    this.file = file
  }

  performImport = (node: Parser.SyntaxNode): Import => {
    assert(node.type === 'import', 'Node must be of type `import`.')

    const importClause = node.namedChild(0)!
    const source = node.namedChild(1)!.text.slice(1, -1)
    const bindings = importClause.namedChildren
      .map(this.resolveImportClauseEntry)
      .filter(isNotUndefined)

    this.checkDuplicateIdentifiers(bindings)
    return this.buildImport(source, bindings, false)
  }

  performExternalImport = (node: Parser.SyntaxNode): Import => {
    assert(
      node.type === 'external_import',
      'Node must be of type `external_import`.',
    )

    const importClause = node.namedChild(0)!
    const source = node.namedChild(1)!.text.slice(1, -1)
    const bindings = importClause.namedChildren
      .map(this.resolveImportClauseEntry)
      .filter(isNotUndefined)

    this.checkDuplicateIdentifiers(bindings)
    return this.buildImport(source, bindings, true)
  }

  private resolveImportClauseEntry = (
    node: Parser.SyntaxNode,
  ): ImportBinding | undefined => {
    switch (node.type) {
      case 'comment':
        return
      case 'external_import_clause_identifier_pair':
        return this.resolveExternalImportClauseIdentifierPair(node)
      case 'identifier_pattern':
        return this.resolveIdentifierPattern(node)
      case 'identifier_pattern_name':
        return this.resolveIdentifierPatternName(node)
      case 'import_clause_identifier_pair':
        return this.resolveImportClauseIdentifierPair(node)
      default:
        throw new InternalError(
          'ResolveImport: Could not find resolver for AST import node ' +
            `'${node.type}'.`,
        )
    }
  }

  private resolveExternalImportClauseIdentifierPair = (
    node: Parser.SyntaxNode,
  ): ImportBinding => {
    const originalIdentifierPatternNameNode = node.namedChild(0)!
    const originalName = originalIdentifierPatternNameNode.text

    const identifierPatternNode = node.namedChild(1)!
    const identifierPatternNameNode = identifierPatternNode.namedChild(0)!
    const name = identifierPatternNameNode.text

    const type = this.analyzer.generate(identifierPatternNode)

    return new ImportBinding(name, originalName, type)
  }

  private resolveIdentifierPattern = (
    node: Parser.SyntaxNode,
  ): ImportBinding => {
    const identifierPatternNameNode = node.namedChild(0)!
    const name = identifierPatternNameNode.text

    const type = this.analyzer.generate(node)

    return new ImportBinding(name, name, type)
  }

  private resolveIdentifierPatternName = (
    node: Parser.SyntaxNode,
  ): ImportBinding => new ImportBinding(node.text, node.text)

  private resolveImportClauseIdentifierPair = (
    node: Parser.SyntaxNode,
  ): ImportBinding => {
    const originalName = node.namedChild(0)!.text
    const name = node.namedChild(1)!.text

    return new ImportBinding(name, originalName)
  }

  private buildImport = (
    relativePath: string,
    bindings: ImportBinding[],
    isExternal: boolean,
  ): Import => {
    const dir = path.dirname(this.file)
    const fullPath = path.join(dir, relativePath)
    if (!relativePath.endsWith(FILE_EXTENSION))
      return { fullPath, relativePath, bindings, isExternal }

    const relativePathAfterCompilation = path.join(
      getOutFile(this.file),
      '..',
      relativePath.replace(FILE_EXTENSION, TARGET_FILE_EXTENSION),
    )
    return {
      fullPath,
      relativePath: relativePathAfterCompilation,
      bindings,
      isExternal,
    }
  }

  private checkDuplicateIdentifiers = (bindings: ImportBinding[]): void => {
    const identifiers = bindings.map((binding) => binding.name)
    const duplicateIdentifier = identifiers.find((identifier, i) =>
      identifiers.slice(i, i).includes(identifier),
    )
    if (!duplicateIdentifier) return

    throw new DuplicateBindingError(duplicateIdentifier)
  }
}