import { Suspense } from 'react';
import WorkflowPanel from '@/components/WorkflowPanel';

function Loading() {
  return (
    <div className="nw-page">
      <div className="nw-container nw-page-loading">正在打开工作区…</div>
    </div>
  );
}

export default function WorkspaceRoute() {
  return (
    <Suspense fallback={<Loading />}>
      <WorkflowPanel />
    </Suspense>
  );
}
