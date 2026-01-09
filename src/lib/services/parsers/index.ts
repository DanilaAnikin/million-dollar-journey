/**
 * CSV Parser Services
 *
 * This module provides parsers for various broker/bank export formats
 * and converts them to the standard ImportRow format.
 */

export { parseTrading212CSV, TRADING212_COLUMNS } from './trading212';
export { parseXTBCSV, XTB_COLUMNS } from './xtb';
export { parseGenericCSV, detectColumnMappings } from './generic';
export type { ParserResult, ParsedTransaction, ParserType } from './types';
