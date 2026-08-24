import { useStore, StoreContext, useStoreProvider } from './stores/StoreContext.jsx';
import { TopBar } from './components/shared/TopBar.jsx';
import { UploadStep } from './components/upload/UploadStep.jsx';
import { AdminView } from './components/admin/AdminView.jsx';
import { UserView } from './components/user/UserView.jsx';
import { PublicView } from './components/public/PublicView.jsx';

function AppInner() {
  const store = useStore();
  return (
    <div className="h-full flex flex-col">
      <TopBar />
      {!store.floorPlan
        ? <UploadStep />
        : store.role === 'admin' ? <AdminView />
        : store.role === 'user'  ? <UserView />
        :                          <PublicView />}
    </div>
  );
}

export function App() {
  const store = useStoreProvider();
  return (
    <StoreContext.Provider value={store}>
      <AppInner />
    </StoreContext.Provider>
  );
}
