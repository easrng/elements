import type * as ts from 'typescript/lib/tsserverlibrary';
import {
  type TemplateLanguageService,
  type TemplateContext,
  decorateWithTemplateLanguageService,
} from 'typescript-template-language-service-decorator';
import {parse, type TreeNode} from './parse.js';

class HtmlTemplateLanguageService implements TemplateLanguageService {
  getSyntacticDiagnostics(context: TemplateContext): ts.Diagnostic[] {
    let errors: {start: number; length: number; message: string}[] = [];
    const {tag} = context.node.parent as ts.TaggedTemplateExpression;
    const nodeStart = context.node.getStart();
    const start = tag.getStart() - 1;
    const length = tag.getWidth();
    const file = context.node.getSourceFile();

    try {
      let holes: ts.Expression[];
      const raw: string[] = [];
      const starts: number[] = [];
      const ends: number[] = [];
      if (context.typescript.isNoSubstitutionTemplateLiteral(context.node)) {
        raw.push(context.node.rawText!);
        starts.push(context.node.getStart());
        ends.push(context.node.getEnd());
        holes = [];
      } else {
        raw.push(context.node.head.rawText!);
        starts.push(context.node.head.getStart());
        ends.push(context.node.head.getEnd());
        holes = context.node.templateSpans.flatMap<ts.Expression>((e) => {
          raw.push(e.literal.rawText!);
          starts.push(e.literal.getStart());
          ends.push(e.literal.getEnd());
          return e.expression;
        });
      }

      let node: TreeNode;
      ({node, errors} = parse(raw, starts, ends));
      while (node.parent) {
        errors.push({
          start: node.start,
          message:
            'Unclosed ' +
            (node.type === '#comment'
              ? 'comment'
              : `tag <${typeof node.type === 'string' ? node.type : '${' + holes[node.type - 1]!.getText() + '}'}>`),
          length: node.length,
        });
        node = node.parent;
      }

      const lines = file.getLineStarts();
      const text = file.getFullText();
      let i: number;
      for (i = 0; i < lines.length; i++) {
        if (lines[i]! > nodeStart) {
          break;
        }
      }

      // eslint-disable-next-line unicorn/prefer-set-has
      const flagArea = text
        // eslint-disable-next-line unicorn/explicit-length-check
        .slice(lines[i - 2] || 0, lines[i - 1] || text.length);

      if (flagArea.includes('@elements-dump')) {
        errors.push({
          start,
          length,
          message: JSON.stringify(
            node,
            (k, v: unknown) => (k === 'parent' ? undefined : v),
            2,
          ),
        });
      }

      if (flagArea.includes('@elements-expect-error')) {
        if (errors.length > 0) {
          errors = [];
        } else {
          errors.push({
            start,
            length,
            message: 'Expected error',
          });
        }
      }
    } catch (error) {
      errors.push({
        start,
        length,
        message: error instanceof Error ? error.stack! : String(error),
      });
    }

    return errors.map(({start, length, message}) => ({
      category: 1 as ts.DiagnosticCategory.Error,
      file,
      code: 0,
      start: -1 * nodeStart + start,
      length,
      messageText: message,
    }));
  }
}

const init = (mod: {typescript: typeof ts}) => {
  return {
    create(info: ts.server.PluginCreateInfo): ts.LanguageService {
      return decorateWithTemplateLanguageService(
        mod.typescript,
        info.languageService,
        info.project,
        new HtmlTemplateLanguageService(),
        {tags: ['html']},
      );
    },
  };
};

export default init;
