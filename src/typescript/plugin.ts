import type * as ts from 'typescript/lib/tsserverlibrary';
import {
  type TemplateLanguageService,
  type TemplateContext,
  decorateWithTemplateLanguageService,
} from 'typescript-template-language-service-decorator';
import {parse, type TreeNode} from './parse.js';

class HtmlTemplateLanguageService implements TemplateLanguageService {
  getSyntacticDiagnostics(context: TemplateContext): ts.Diagnostic[] {
    let errors: string[] = [];
    const {tag} = context.node.parent as ts.TaggedTemplateExpression;
    const nodeStart = context.node.getStart();
    const start = -1 * (nodeStart + 1) + tag.getStart();
    const length = tag.getWidth();
    const file = context.node.getSourceFile();

    try {
      let holes: ts.Expression[];
      const t: string[] = [];
      if (context.typescript.isNoSubstitutionTemplateLiteral(context.node)) {
        t.push(context.node.text);
        // X: context.node.rawText!
        holes = [];
      } else {
        t.push(context.node.head.text);
        // X: t.raw.push(context.node.head.rawText!);
        holes = context.node.templateSpans.flatMap<ts.Expression>((e) => {
          t.push(e.literal.text);
          // X: t.raw.push(e.literal.rawText!);
          return e.expression;
        });
      }

      let node: TreeNode;
      ({node, errors} = parse(t));
      while (node.parent) {
        errors.push(
          'Unclosed ' +
            (node.type === '#comment'
              ? 'comment'
              : `tag <${typeof node.type === 'string' ? node.type : '${' + holes[node.type - 1]!.getText() + '}'}>`),
        );
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
        errors.push(
          JSON.stringify(
            node,
            (k, v: unknown) => (k === 'parent' ? undefined : v),
            2,
          ),
        );
      }

      if (flagArea.includes('@elements-expect-error')) {
        return errors.length > 0
          ? []
          : [
              {
                category: 1 as ts.DiagnosticCategory.Error,
                file,
                code: 0,
                start,
                length,
                messageText: 'Expected error',
              },
            ];
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.stack! : String(error));
    }

    return errors.map((error) => ({
      category: 1 as ts.DiagnosticCategory.Error,
      file,
      code: 0,
      start,
      length,
      messageText: error,
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
