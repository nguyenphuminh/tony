import path from 'path'

export const FILE_EXTENSION = Object.freeze('.tn')
export const TARGET_FILE_EXTENSION = Object.freeze('.js')

export const KEYWORD_IDENTIFIERS = Object.freeze(['eval'])

const STDLIB_PATH = path.join(__dirname, 'stdlib')
export const DEFAULT_IMPORTS =
  Object.freeze(`import * as stdlib from '${STDLIB_PATH}'`)