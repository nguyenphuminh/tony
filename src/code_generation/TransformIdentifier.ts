import { OPERATOR_REGEX, INTERNAL_IDENTIFIER_PREFIX } from '../constants'

export class TransformIdentifier {
  private identifiers: string[] = []

  perform = (identifier: string): string => {
    if (!OPERATOR_REGEX.test(identifier)) return identifier

    const index = this.identifiers.indexOf(identifier)
    if (index != -1) return `${INTERNAL_IDENTIFIER_PREFIX}${index}`

    const length = this.identifiers.push(identifier)
    return `${INTERNAL_IDENTIFIER_PREFIX}${length - 1}`
  }
}
