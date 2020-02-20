import { Graph } from 'graphlib';
import PQueue from 'p-queue';
import { ResolvedComponent } from '../../workspace/resolved-component';
import { Consumer } from '../../../consumer';
import DependencyGraph from '../../../scope/graph/scope-graph';
import { Workspace } from '../../workspace';
import { ScriptsOptions } from '../scripts-options';
import { createExecutionReporter } from './execution-reporter';
import { createSubGraph } from './sub-graph';

type Visitor = (component: ResolvedComponent, componentReporter: any) => Promise<any>;

export function getGraph(consumer: Consumer) {
  return DependencyGraph.buildGraphFromWorkspace(consumer, false, true);
}

export async function getTopologicalWalker(
  seedComponents: ResolvedComponent[],
  options: ScriptsOptions,
  workspace: Workspace,
  getGraphFn = getGraph
) {
  const workspaceGraph = await getGraphFn(workspace.consumer);
  const graph = createSubGraph(seedComponents, options, workspaceGraph);
  const comps = await workspace.load(graph.nodes());
  const q = new PQueue({ concurrency: options.concurrency });
  const reporter = createExecutionReporter(comps);

  const getSources = (g: Graph) => g.sources().filter(seed => !reporter.shouldExecute(seed));
  const getSeeders = (g: Graph) => {
    const sources = getSources(g);
    return sources.length ? sources : [g.nodes()[0]].filter(v => v);
  };

  async function walk(visitor: Visitor) {
    if (!graph.nodes().length) {
      return;
    }

    const seeders = getSeeders(graph).map(seed => {
      const component = reporter.getResolvedComponent(seed);
      const componentReporter = reporter.getSingleComponentReporter(seed);
      reporter.sendToQueue(seed);
      const seederPromise = q
        .add(() => visitor(component, componentReporter).catch(e => e))
        .then(res => {
          reporter.setResult(seed, res); // -> setRecursive
          graph.removeNode(seed);

          const sources = getSeeders(graph);

          return sources.length || (!q.pending && graph.nodes().length) ? walk(visitor) : undefined;
        })
        .catch(err => {
          reporter.setResult(seed, err);
        });
      return seederPromise;
    });
    await Promise.all(seeders);
  }

  return {
    walk,
    reporter
  };
}

/**
 * TODO
 * cache capsules to reuse - DONE
   cache script execution -
   proper output.
   stream execution for parsing
   {
      a: ['b','c']
      b: ['c']
      c: []
   },
   const {mockSpace, mockComponents} = createTestSuite()
   fake visitor which returns an array of processes.
 */
