import { Printer } from './printer';
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
  NotNode,
  NewLineNode,
  ReturnNode,
  parens,
  IsNullOrEmptyNode,
} from '../ast';

const TAB = '  ';

class VtlPrinter extends Printer {
  protected printIf(node: IfNode, indent: string = '') {
    if (node.inline) {
      return `#if( ${this.printExpr(node.predicate, '')} ) ${this.printExpr(node.expr, '')} #end`;
    }
    return `${indent}#if( ${this.printExpr(node.predicate, '')} )\n${this.printExpr(node.expr, indent + TAB)}\n${indent}#end`;
  }

  protected printIfElse(node: IfElseNode, indent: string = '') {
    if (node.inline) {
      return (
        `#if( ${this.printExpr(node.predicate)} ) ` +
        `${this.printExpr(node.ifExpr)} ` +
        `#else ` +
        `${this.printExpr(node.elseExpr)} ` +
        `#end`
      );
    }
    return (
      `${indent}#if( ${this.printExpr(node.predicate)} )\n` +
      `${this.printExpr(node.ifExpr, indent + TAB)}\n` +
      `${indent}#else\n` +
      `${this.printExpr(node.elseExpr, indent + TAB)}\n` +
      `${indent}#end`
    );
  }

  protected printAnd(node: AndNode, indent: string = ''): string {
    return indent + node.expressions.map((e: Expression) => this.printExpr(e)).join(' && ');
  }

  protected printOr(node: OrNode, indent: string = ''): string {
    return indent + node.expressions.map((e: Expression) => this.printExpr(e)).join(' || ');
  }

  protected printParens(node: ParensNode, indent: string = ''): string {
    return `${indent}(${this.printExpr(node.expr)})`;
  }

  protected printEquals(node: EqualsNode, indent: string = ''): string {
    return `${indent}${this.printExpr(node.leftExpr)} == ${this.printExpr(node.rightExpr)}`;
  }

  protected printNotEquals(node: NotEqualsNode, indent: string = ''): string {
    return `${indent}${this.printExpr(node.leftExpr)} != ${this.printExpr(node.rightExpr)}`;
  }

  protected printForEach(node: ForEachNode, indent: string = ''): string {
    return (
      `${indent}#foreach( ${this.printExpr(node.key)} in ${this.printExpr(node.collection)} )\n` +
      node.expressions.map((e: Expression) => this.printExpr(e, indent + TAB)).join('\n') +
      `\n${indent}#end`
    );
  }

  protected printString(node: StringNode): string {
    return `"${node.value}"`;
  }

  protected printBool(node: BooleanNode): string {
    return `${node.value}`;
  }

  protected printRaw(node: RawNode, indent: string = ''): string {
    return `${indent}${node.value}`;
  }

  protected printQuotes(node: QuotesNode): string {
    return `"${this.printExpr(node.expr)}"`;
  }

  protected printInt(node: IntNode): string {
    return `${node.value}`;
  }

  protected printFloat(node: FloatNode): string {
    return `${node.value}`;
  }

  protected printNull(node: NullNode): string {
    return `null`;
  }

  protected printReference(node: ReferenceNode): string {
    return `\$${node.value}`;
  }

  protected printQuietReference(node: QuietReferenceNode, indent: string = ''): string {
    const val = typeof node.value === 'string' ? node.value : this.printExpr(node.value);
    return `${indent}$util.qr(${val})`;
  }

  printObject(node: ObjectNode, indent: string = ''): string {
    const attributes = node.attributes.map((attr: [string, Expression], i: number) => {
      return `${indent}${TAB}"${attr[0]}": ${this.printExpr(attr[1], indent + TAB)}${i < node.attributes.length - 1 ? ',' : ''}`;
    });
    const divider = attributes.length > 0 ? `\n${indent}` : '';
    return `{${divider}${attributes.join(divider)}${divider}}`;
  }

  protected printList(node: ListNode, indent: string = ''): string {
    const values = node.expressions.map((e: Expression) => this.printExpr(e, '')).join(', ');
    return `${indent}[${values}]`;
  }

  protected printSet(node: SetNode, indent: string = ''): string {
    return `${indent}#set( ${this.printReference(node.key)} = ${this.printExpr(node.value, '')} )`;
  }

  protected printComment(node: CommentNode, indent: string = ''): string {
    return `${indent}## ${node.text} **`;
  }

  protected printCompoundExpression(node: CompoundExpressionNode, indent: string = ''): string {
    if (node.recurseIndent) {
      return node.expressions.map((node: Expression) => this.printExpr(node, indent)).join(node.joiner);
    }
    return indent + node.expressions.map((node: Expression) => this.printExpr(node)).join(node.joiner);
  }

  protected printToJson(node: ToJsonNode, indent: string = ''): string {
    return `${indent}$util.toJson(${this.printExpr(node.expr, '')})`;
  }

  protected printIsNullOrEmpty(node: IsNullOrEmptyNode, indent: string = ''): string {
    return `${indent}$util.isNullOrEmpty(${this.printExpr(node.expr, '')})`;
  }

  protected printNot(node: NotNode, indent: string = ''): string {
    return `${indent}!${this.printExpr(node.expr, '')}`;
  }

  protected printNewLine(node: NewLineNode): string {
    return '\n';
  }

  protected printReturn(node: ReturnNode, indent: string = ''): string {
    let suffix: string = '';
    if (node.value !== undefined) {
      suffix = this.printParens(parens(node.value));
    }
    return `${indent}#return` + suffix;
  }
}

export const vtlPrinter = new VtlPrinter();
