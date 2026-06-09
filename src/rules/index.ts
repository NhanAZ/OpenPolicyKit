import { Rule } from '../types';
import opk001 from './opk-001-ai-credentials';
import opk002 from './opk-002-prompt-artifacts';
import opk003 from './opk-003-placeholder-code';
import opk004 from './opk-004-dependency-versions';
import opk005 from './opk-005-risky-workflows';
import opk006 from './opk-006-hallucinated-dependencies';
import opk007 from './opk-007-large-generated-files';

export const rules: Rule[] = [opk001, opk002, opk003, opk004, opk005, opk006, opk007];
