import {
  Expression,
  IfNode,
  IfElseNode,
  AndNode,
  OrNode,
  ParensNode,
  EqualsNode,
  NotEqualsNode,
  ForEachNode,
  StringNode,
  IntNode,
  NullNode,
  ReferenceNode,
  QuietReferenceNode,
  ObjectNode,
  ListNode,
  FloatNode,
  QuotesNode,
  RawNode,
  SetNode,
  CompoundExpressionNode,
  CommentNode,
  ToJsonNode,
  BooleanNode,
  compoundExpression,
  comment,
  NotNode,
  NewLineNode,
  ReturnNode,
  IsNullOrEmptyNode,
} from '../ast';

export abstract class Printer {
  // Abstract methods implemented by specific printers.
  protected abstract printIf(node: IfNode, indent: string);
  protected abstract printIfElse(node: IfElseNode, indent: string);
  protected abstract printAnd(node: AndNode, indent: string): string;
  protected abstract printOr(node: OrNode, indent: string): string;
  protected abstract printParens(node: ParensNode, indent: string): string;
  protected abstract printEquals(node: EqualsNode, indent: string): string;
  protected abstract printNotEquals(node: NotEqualsNode, indent: string): string;
  protected abstract printForEach(node: ForEachNode, indent: string): string;
  protected abstract printString(node: StringNode): string;
  protected abstract printBool(node: BooleanNode): string;
  protected abstract printRaw(node: RawNode, indent: string): string;
  protected abstract printQuotes(node: QuotesNode): string;
  protected abstract printInt(node: IntNode): string;
  protected abstract printFloat(node: FloatNode): string;
  protected abstract printNull(node: NullNode): string;
  protected abstract printReference(node: ReferenceNode): string;
  protected abstract printQuietReference(node: QuietReferenceNode, indent: string): string;
  abstract printObject(node: ObjectNode, indent: string): string;
  protected abstract printList(node: ListNode, indent: string): string;
  protected abstract printSet(node: SetNode, indent: string): string;
  protected abstract printComment(node: CommentNode, indent: string): string;
  protected abstract printCompoundExpression(node: CompoundExpressionNode, indent: string): string;
  protected abstract printToJson(node: ToJsonNode, indent: string): string;
  protected abstract printIsNullOrEmpty(node: IsNullOrEmptyNode, indent: string): string;
  protected abstract printNot(node: NotNode, indent: string): string;
  protected abstract printNewLine(node: NewLineNode): string;
  protected abstract printReturn(node: ReturnNode, indent: string): string;

  protected printExpr(expr: Expression, indent: string = ''): string {
    if (!expr) {
      return '';
    }
    switch (expr.kind) {
      case 'If':
        return this.printIf(expr, indent);
      case 'IfElse':
        return this.printIfElse(expr, indent);
      case 'And':
        return this.printAnd(expr, indent);
      case 'Or':
        return this.printOr(expr, indent);
      case 'Parens':
        return this.printParens(expr, indent);
      case 'Equals':
        return this.printEquals(expr, indent);
      case 'NotEquals':
        return this.printNotEquals(expr, indent);
      case 'ForEach':
        return this.printForEach(expr, indent);
      case 'String':
        return this.printString(expr);
      case 'Raw':
        return this.printRaw(expr, indent);
      case 'Quotes':
        return this.printQuotes(expr);
      case 'Float':
        return this.printFloat(expr);
      case 'Int':
        return this.printInt(expr);
      case 'Boolean':
        return this.printBool(expr);
      case 'Null':
        return this.printNull(expr);
      case 'Reference':
        return this.printReference(expr);
      case 'QuietReference':
        return this.printQuietReference(expr, indent);
      case 'Object':
        return this.printObject(expr, indent);
      case 'List':
        return this.printList(expr, indent);
      case 'Set':
        return this.printSet(expr, indent);
      case 'Comment':
        return this.printComment(expr, indent);
      case 'CompoundExpression':
        return this.printCompoundExpression(expr, indent);
      case 'Util.ToJson':
        return this.printToJson(expr, indent);
      case 'Util.isNullOrEmpty':
        return this.printIsNullOrEmpty(expr, indent);
      case 'Not':
        return this.printNot(expr, indent);
      case 'NewLine':
        return this.printNewLine(expr);
      case 'Return':
        return this.printReturn(expr, indent);
      default:
        return '';
    }
  }

  print(expr: Expression): string {
    return this.printExpr(expr);
  }

  printBlock(name: string) {
    return (expr: Expression): string => {
      return this.printExpr(compoundExpression([comment(`[Start] ${name}.`), expr, comment(`[End] ${name}.`)]));
    };
  }
}
