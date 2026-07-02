import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import Dialog from '../components/Dialog';
import LeafletMap from '../components/LeafletMap';
import { useAuth } from '../hooks/useAuth';
import type { AuthUser } from '../services/authService';
import {
  itemService,
  type CreateLocationPayload,
  type UpdateLocationPayload,
} from '../services/itemService';
import { itemPhotoService, type ItemPhoto } from '../services/itemPhotoService';
import { delegationService } from '../services/delegationService';
import Autocomplete, {
  type AutocompleteOption,
} from '../components/Autocomplete';
import CategoryDropdown from '../components/CategoryDropdown';
import type { Item, CreateItemPayload } from '../types/item';
import type { Category } from '../types/category';
import type { Group } from '../types/group';
import type { Location } from '../types/location';
import type { Owner } from '../types/owner';
import type { Status } from '../types/status';
import type {
  Delegation,
  CreateDelegationPayload,
  PermissionLevel,
} from '../types/delegation';
import { jsonAuthHeaders } from '../services/authHeaders';

interface ModalState {
  mode: 'create' | 'edit';
  itemId?: number;
}

type SortKey =
  | 'name'
  | 'manufacturer'
  | 'model'
  | 'serial'
  | 'category'
  | 'status'
  | 'location'
  | 'owner';
type SortDirection = 'asc' | 'desc';

const PAGE_SIZE = 5;

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [photos, setPhotos] = useState<ItemPhoto[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [filters, setFilters] = useState({
    query: '',
    categoryId: '',
    statusId: '',
    locationId: '',
    ownerId: '',
    manufacturer: '',
  });
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'name',
    direction: 'asc',
  });
  const [page, setPage] = useState(1);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (formError && modalRef.current) {
      modalRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [formError]);

  const { user } = useAuth();
  const [itemDelegations, setItemDelegations] = useState<Delegation[]>([]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        itemsData,
        categoriesData,
        locationsData,
        ownersData,
        groupsData,
        statusesData,
      ] = await Promise.all([
        itemService.getAll(),
        itemService.getCategories(),
        itemService.getLocations(),
        itemService.getOwners(),
        itemService.getGroups(),
        itemService.getStatuses(),
      ]);
      setItems(itemsData);
      setCategories(categoriesData);
      setLocations(locationsData);
      setOwners(ownersData);
      setGroups(groupsData);
      setStatuses(statusesData);
    } catch {
      setError('Nie udało się pobrać przedmiotów.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  const handleCreate = async (payload: CreateItemPayload) => {
    setFormLoading(true);
    setFormError(null);
    try {
      await itemService.create(payload);
      await fetchItems();
      setSuccessMessage('Przedmiot został dodany pomyślnie.');
      setModal(null);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Wystąpił błąd.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async (
    itemId: number,
    payload: Partial<CreateItemPayload>
  ) => {
    setFormLoading(true);
    setFormError(null);
    try {
      await itemService.update(itemId, payload);
      await fetchItems();
      setSuccessMessage('Przedmiot został zaktualizowany.');
      setModal(null);
    } catch (e: unknown) {
      setFormError(
        e instanceof Error ? e.message : 'Wystąpił błąd podczas aktualizacji.'
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedItem) return;
    const confirmed = window.confirm(
      `Usunąć przedmiot "${selectedItem.name}"? Tej operacji nie można cofnąć.`
    );
    if (!confirmed) return;
    setDeleteLoading(true);
    setError(null);
    try {
      await itemService.remove(selectedItem.id);
      setSelectedItemId(null);
      await fetchItems();
      setSuccessMessage('Przedmiot został usunięty.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Nie udało się usunąć przedmiotu.'
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const openCreate = () => {
    setFormError(null);
    setModal({ mode: 'create' });
  };
  const openEdit = () => {
    setFormError(null);
    setModal({ mode: 'edit', itemId: selectedItemId ?? undefined });
  };

  const getCategoryName = useCallback(
    (id: number) => categories.find((c) => c.id === id)?.name ?? '—',
    [categories]
  );
  const getStatusName = useCallback(
    (id: number) => statuses.find((s) => s.id === id)?.name ?? '—',
    [statuses]
  );
  const getLocationName = useCallback(
    (id: number) => locations.find((l) => l.id === id)?.name ?? '—',
    [locations]
  );
  const getOwnerName = useCallback(
    (item: Item) =>
      item.ownerGroupId
        ? `Grupa: ${groups.find((group) => group.id === item.ownerGroupId)?.name ?? item.ownerGroupId}`
        : (owners.find((o) => o.id === item.ownerId)?.fullName ?? '—'),
    [groups, owners]
  );

  const filteredItems = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    const manufacturer = filters.manufacturer.trim().toLowerCase();

    const targetCategoryIds = new Set<number>();
    if (filters.categoryId) {
      const selectedId = Number(filters.categoryId);
      targetCategoryIds.add(selectedId);
      const queue = [selectedId];
      while (queue.length > 0) {
        const currentId = queue.shift()!;
        for (const cat of categories) {
          if (cat.parentId === currentId && !targetCategoryIds.has(cat.id)) {
            targetCategoryIds.add(cat.id);
            queue.push(cat.id);
          }
        }
      }
    }

    const visible = items.filter((item) => {
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.serial?.toLowerCase().includes(query) ||
        item.inventoryNumber?.toLowerCase().includes(query) ||
        item.model?.toLowerCase().includes(query);
      const matchesManufacturer =
        !manufacturer || item.manufacturer.toLowerCase().includes(manufacturer);
      const matchesCategory =
        !filters.categoryId || targetCategoryIds.has(item.categoryId);
      const matchesStatus =
        !filters.statusId || item.statusId === Number(filters.statusId);
      const matchesLocation =
        !filters.locationId || item.locationId === Number(filters.locationId);
      const matchesOwner =
        !filters.ownerId || item.ownerId === Number(filters.ownerId);
      return (
        matchesQuery &&
        matchesManufacturer &&
        matchesCategory &&
        matchesStatus &&
        matchesLocation &&
        matchesOwner
      );
    });
    return [...visible].sort((a, b) => {
      const aValue = sortValue(a, sort.key, {
        getCategoryName,
        getStatusName,
        getLocationName,
        getOwnerName,
      });
      const bValue = sortValue(b, sort.key, {
        getCategoryName,
        getStatusName,
        getLocationName,
        getOwnerName,
      });
      const result = aValue.localeCompare(bValue, 'pl');
      return sort.direction === 'asc' ? result : -result;
    });
  }, [
    categories,
    filters,
    getCategoryName,
    getLocationName,
    getOwnerName,
    getStatusName,
    items,
    sort,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );
  const selectedItem =
    filteredItems.find((item) => item.id === selectedItemId) ??
    filteredItems[0] ??
    items[0];
  const selectedLocation = selectedItem
    ? locations.find((location) => location.id === selectedItem.locationId)
    : undefined;

  useEffect(() => {
    let cancelled = false;
    const itemId = selectedItem?.id;

    setPhotos([]);
    setItemDelegations([]);
    setPhotoError(null);
    if (!itemId) return;

    async function loadPhotos() {
      setPhotoLoading(true);
      try {
        const nextPhotos = await itemPhotoService.list(itemId);
        if (!cancelled) setPhotos(nextPhotos);
      } catch (err) {
        if (!cancelled) {
          setPhotoError(
            err instanceof Error
              ? err.message
              : 'Nie udało się pobrać historii zdjęć.'
          );
        }
      } finally {
        if (!cancelled) setPhotoLoading(false);
      }
    }
    async function loadDelegations() {
      try {
        const nextDelegations = await delegationService.getAll(itemId);
        if (!cancelled) setItemDelegations(nextDelegations);
      } catch {
        if (!cancelled) setItemDelegations([]);
      }
    }

    void loadPhotos();
    void loadDelegations();

    return () => {
      cancelled = true;
    };
  }, [selectedItem?.id]);

  const canManageLocation = useMemo(() => {
    if (!selectedItem || !user) return false;
    if (user.role === 'admin') return true;
    if (selectedItem.ownerId === user.id) return true;
    const hasDelegation = itemDelegations.some(
      (d) => d.user_id === user.id && d.permission === 'manage'
    );
    if (hasDelegation) return true;
    return false;
  }, [selectedItem, user, itemDelegations]);

  const permissionLevel = useMemo<
    'admin' | 'owner' | 'manage' | 'edit' | null
  >(() => {
    if (!selectedItem || !user) return null;
    if (user.role === 'admin') return 'admin';
    if (selectedItem.ownerId === user.id) return 'owner';
    const hasManageDelegation = itemDelegations.some(
      (d) => d.user_id === user.id && d.permission === 'manage'
    );
    if (hasManageDelegation) return 'manage';
    const hasEditDelegation = itemDelegations.some(
      (d) => d.user_id === user.id && d.permission === 'edit'
    );
    if (hasEditDelegation) return 'edit';
    return null;
  }, [selectedItem, user, itemDelegations]);

  const handlePhotoUpload = async (file: File) => {
    if (!selectedItem) return;
    setPhotoError(null);
    setPhotoLoading(true);
    try {
      await itemPhotoService.upload(selectedItem.id, file);
      setPhotos(await itemPhotoService.list(selectedItem.id));
      setSuccessMessage('Zdjęcie zostało dodane.');
    } catch (err) {
      setPhotoError(
        err instanceof Error ? err.message : 'Nie udało się dodać zdjęcia.'
      );
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleCreateDelegation = async (payload: CreateDelegationPayload) => {
    if (!selectedItem) return;
    await delegationService.create(selectedItem.id, payload);
    setItemDelegations(await delegationService.getAll(selectedItem.id));
    setSuccessMessage('Delegacja została dodana.');
  };

  const handleUpdateDelegation = async (
    id: number,
    payload: CreateDelegationPayload
  ) => {
    if (!selectedItem) return;
    await delegationService.update(selectedItem.id, id, payload);
    setItemDelegations(await delegationService.getAll(selectedItem.id));
    setSuccessMessage('Delegacja została zaktualizowana.');
  };

  const handleDeleteDelegation = async (delegationId: number) => {
    if (!selectedItem) return;
    try {
      await delegationService.remove(selectedItem.id, delegationId);
      setItemDelegations(await delegationService.getAll(selectedItem.id));
      setSuccessMessage('Delegacja została usunięta.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Nie udało się usunąć delegacji.'
      );
    }
  };

  const handleLocationChange = async (locationId: number) => {
    if (!selectedItem) return;
    try {
      await itemService.updateLocation(selectedItem.id, locationId);
      await fetchItems();
      setSuccessMessage('Lokalizacja przedmiotu została zaktualizowana.');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Nie udało się zaktualizować lokalizacji.'
      );
    }
  };

  const handleCreateLocation = async (payload: CreateLocationPayload) => {
    if (!selectedItem) return;
    try {
      const location = await itemService.createLocation(payload);
      await itemService.updateLocation(selectedItem.id, location.id);
      await fetchItems();
      setSuccessMessage('Nowy punkt lokalizacji został dodany i przypisany.');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Nie udało się dodać punktu lokalizacji.'
      );
    }
  };

  const handleUpdateLocationPoint = async (
    locationId: number,
    payload: UpdateLocationPayload
  ) => {
    try {
      await itemService.updateLocationPoint(locationId, payload);
      await fetchItems();
      setSuccessMessage('Lokalizacja została zaktualizowana.');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Nie udało się zaktualizować lokalizacji.'
      );
    }
  };

  const handleDeleteLocationPoint = async (locationId: number) => {
    if (!window.confirm('Usunąć tę lokalizację?')) return;
    try {
      await itemService.deleteLocationPoint(locationId);
      await fetchItems();
      setSuccessMessage('Lokalizacja została usunięta.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Nie udało się usunąć lokalizacji.'
      );
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Przedmioty</h1>
          <p className="page-subtitle">Zarządzaj przedmiotami w systemie</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          + Dodaj przedmiot
        </button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {successMessage && (
        <div className="alert alert-success">{successMessage}</div>
      )}
      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <span>Ładowanie przedmiotów…</span>
        </div>
      ) : (
        <>
          <ItemsFilters
            categories={categories}
            filters={filters}
            locations={locations}
            onChange={(patch) => {
              setFilters((current) => ({ ...current, ...patch }));
              setPage(1);
            }}
            owners={owners}
            statuses={statuses}
          />
          <table className="table">
            <thead>
              <tr>
                <th>
                  <SortButton
                    active={sort.key === 'name'}
                    direction={sort.direction}
                    label="Nazwa"
                    onClick={() => setSort(nextSort(sort, 'name'))}
                  />
                </th>
                <th>
                  <SortButton
                    active={sort.key === 'manufacturer'}
                    direction={sort.direction}
                    label="Producent"
                    onClick={() => setSort(nextSort(sort, 'manufacturer'))}
                  />
                </th>
                <th>
                  <SortButton
                    active={sort.key === 'model'}
                    direction={sort.direction}
                    label="Model"
                    onClick={() => setSort(nextSort(sort, 'model'))}
                  />
                </th>
                <th>
                  <SortButton
                    active={sort.key === 'serial'}
                    direction={sort.direction}
                    label="Nr seryjny"
                    onClick={() => setSort(nextSort(sort, 'serial'))}
                  />
                </th>
                <th>
                  <SortButton
                    active={sort.key === 'category'}
                    direction={sort.direction}
                    label="Kategoria"
                    onClick={() => setSort(nextSort(sort, 'category'))}
                  />
                </th>
                <th>
                  <SortButton
                    active={sort.key === 'status'}
                    direction={sort.direction}
                    label="Status"
                    onClick={() => setSort(nextSort(sort, 'status'))}
                  />
                </th>
                <th>
                  <SortButton
                    active={sort.key === 'location'}
                    direction={sort.direction}
                    label="Lokalizacja"
                    onClick={() => setSort(nextSort(sort, 'location'))}
                  />
                </th>
                <th>
                  {' '}
                  <SortButton
                    active={sort.key === 'owner'}
                    direction={sort.direction}
                    label="Właściciel / opiekun"
                    onClick={() => setSort(nextSort(sort, 'owner'))}
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={9}>Brak przedmiotów spełniających filtry.</td>
                </tr>
              ) : (
                paginatedItems.map((item) => (
                  <tr
                    key={item.id}
                    aria-label={`Pokaż szczegóły przedmiotu ${item.name}`}
                    aria-pressed={item.id === selectedItem?.id}
                    className={
                      item.id === selectedItem?.id ? 'row-selected' : ''
                    }
                    onClick={() => setSelectedItemId(item.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedItemId(item.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <td className="td-name">{item.name}</td>
                    <td>{item.manufacturer}</td>
                    <td>{item.model ?? '—'}</td>
                    <td>{item.serial ?? '—'}</td>
                    <td>{getCategoryName(item.categoryId)}</td>
                    <td>{getStatusName(item.statusId)}</td>
                    <td>{getLocationName(item.locationId)}</td>
                    <td>{getOwnerName(item)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="table-pagination">
            <span>
              Strona {currentPage} z {totalPages} · Wyniki:{' '}
              {filteredItems.length}
            </span>
            <div className="td-actions">
              <button
                className="btn btn-secondary"
                disabled={currentPage === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                type="button"
              >
                Poprzednia
              </button>
              <button
                className="btn btn-secondary"
                disabled={currentPage === totalPages}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                type="button"
              >
                Następna
              </button>
            </div>
          </div>
          {selectedItem && (
            <>
              <LocationMapPanel
                item={selectedItem}
                location={selectedLocation}
                locations={locations}
                onCreateLocation={handleCreateLocation}
                onUpdateLocation={handleUpdateLocationPoint}
                onDeleteLocation={handleDeleteLocationPoint}
                onLocationChange={handleLocationChange}
                ownerName={getOwnerName(selectedItem)}
                statusName={getStatusName(selectedItem.statusId)}
                canEdit={canManageLocation}
                canEditItem={permissionLevel !== null}
                canDelete={user?.role === 'admin'}
                deleteLoading={deleteLoading}
                onDelete={handleDeleteSelected}
                onEdit={openEdit}
              />
              <ItemPhotosPanel
                item={selectedItem}
                photos={photos}
                error={photoError}
                loading={photoLoading}
                onUpload={handlePhotoUpload}
              />
              <ItemDelegationsPanel
                item={selectedItem}
                delegations={itemDelegations}
                canManage={canManageLocation}
                onCreate={handleCreateDelegation}
                onUpdate={handleUpdateDelegation}
                onDelete={handleDeleteDelegation}
              />
            </>
          )}
        </>
      )}
      {modal && (
        <Dialog
          title={
            modal.mode === 'create' ? 'Nowy przedmiot' : 'Edytuj przedmiot'
          }
          onClose={() => setModal(null)}
        >
          <div ref={modalRef}>
            {formError && <div className="alert alert-error">{formError}</div>}
            {modal.mode === 'create' ? (
              <CreateForm
                categories={categories}
                groups={groups}
                locations={locations}
                owners={owners}
                statuses={statuses}
                onSubmit={handleCreate}
                loading={formLoading}
                currentUser={user}
              />
            ) : (
              <EditForm
                item={selectedItem}
                categories={categories}
                groups={groups}
                owners={owners}
                statuses={statuses}
                onSubmit={(itemId, payload) => handleEdit(itemId, payload)}
                loading={formLoading}
                permissionLevel={permissionLevel}
              />
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
}

function ItemsFilters({
  categories,
  filters,
  locations,
  onChange,
  owners,
  statuses,
}: {
  categories: Category[];
  filters: {
    query: string;
    categoryId: string;
    statusId: string;
    locationId: string;
    ownerId: string;
    manufacturer: string;
  };
  locations: Location[];
  onChange: (patch: Partial<typeof filters>) => void;
  owners: Owner[];
  statuses: Status[];
}) {
  return (
    <section className="filters-panel" aria-label="Filtry przedmiotów">
      <label className="form-label" htmlFor="item-filter-query">
        Szukaj (nazwa, opis, model, seryjny, inwentarzowy)
      </label>
      <input
        className="form-input"
        id="item-filter-query"
        onChange={(event) => onChange({ query: event.target.value })}
        placeholder="np. oscyloskop"
        value={filters.query}
      />
      <label className="form-label" htmlFor="item-filter-manufacturer">
        Producent
      </label>
      <input
        className="form-input"
        id="item-filter-manufacturer"
        onChange={(event) => onChange({ manufacturer: event.target.value })}
        placeholder="np. Tektronix"
        value={filters.manufacturer}
      />
      <label className="form-label" htmlFor="item-filter-category">
        Kategoria
      </label>
      <CategoryDropdown
        categories={categories}
        value={filters.categoryId ? Number(filters.categoryId) : ''}
        onChange={(val) =>
          onChange({ categoryId: val === '' ? '' : String(val) })
        }
        allowEmpty
        emptyLabel="Wszystkie"
      />
      <label className="form-label" htmlFor="item-filter-status">
        Status
      </label>
      <select
        className="form-input"
        id="item-filter-status"
        onChange={(event) => onChange({ statusId: event.target.value })}
        value={filters.statusId}
      >
        <option value="">Wszystkie</option>
        {statuses.map((status) => (
          <option key={status.id} value={status.id}>
            {status.name}
          </option>
        ))}
      </select>
      <label className="form-label" htmlFor="item-filter-location">
        Lokalizacja
      </label>
      <select
        className="form-input"
        id="item-filter-location"
        onChange={(event) => onChange({ locationId: event.target.value })}
        value={filters.locationId}
      >
        <option value="">Wszystkie</option>
        {locations.map((location) => (
          <option key={location.id} value={location.id}>
            {location.name}
          </option>
        ))}
      </select>
      <label className="form-label" htmlFor="item-filter-owner">
        Właściciel / opiekun
      </label>
      <select
        className="form-input"
        id="item-filter-owner"
        onChange={(event) => onChange({ ownerId: event.target.value })}
        value={filters.ownerId}
      >
        <option value="">Wszyscy</option>
        {owners.map((owner) => (
          <option key={owner.id} value={owner.id}>
            {owner.fullName}
          </option>
        ))}
      </select>
    </section>
  );
}

function SortButton({
  active,
  direction,
  label,
  onClick,
}: {
  active: boolean;
  direction: SortDirection;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className="table-sort-button" onClick={onClick} type="button">
      {label}
      {active ? ` ${direction === 'asc' ? 'rosnąco' : 'malejąco'}` : ''}
    </button>
  );
}

function nextSort(
  current: { key: SortKey; direction: SortDirection },
  key: SortKey
): { key: SortKey; direction: SortDirection } {
  return {
    key,
    direction: (current.key === key && current.direction === 'asc'
      ? 'desc'
      : 'asc') as SortDirection,
  };
}

function sortValue(
  item: Item,
  key: SortKey,
  helpers: {
    getCategoryName: (id: number) => string;
    getStatusName: (id: number) => string;
    getLocationName: (id: number) => string;
    getOwnerName: (item: Item) => string;
  }
): string {
  if (key === 'category') return helpers.getCategoryName(item.categoryId);
  if (key === 'status') return helpers.getStatusName(item.statusId);
  if (key === 'location') return helpers.getLocationName(item.locationId);
  if (key === 'model') return item.model ?? '';
  if (key === 'serial') return item.serial ?? '';
  if (key === 'owner') return helpers.getOwnerName(item);
  return item[key] ?? '';
}

function LocationMapPanel({
  item,
  location,
  locations,
  onCreateLocation,
  onUpdateLocation,
  onDeleteLocation,
  onLocationChange,
  ownerName,
  statusName,
  canEdit,
  canEditItem,
  canDelete,
  deleteLoading,
  onDelete,
  onEdit,
}: {
  item: Item;
  location: Location | undefined;
  locations: Location[];
  onCreateLocation: (p: CreateLocationPayload) => void;
  onUpdateLocation: (id: number, p: UpdateLocationPayload) => void;
  onDeleteLocation: (id: number) => void;
  onLocationChange: (locationId: number) => void;
  ownerName: string;
  statusName: string;
  canEdit: boolean;
  canEditItem: boolean;
  canDelete: boolean;
  deleteLoading: boolean;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const [newLocation, setNewLocation] = useState({
    name: '',
    kind: 'internal' as 'internal' | 'external',
    building: '',
    room: '',
    cabinet: '',
    shelf: '',
    mapX: '',
    mapY: '',
  });
  const [previewCoords, setPreviewCoords] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [editingLocation, setEditingLocation] = useState(false);
  const [locationDraft, setLocationDraft] = useState({
    name: location?.name ?? '',
    kind: location?.kind ?? 'internal',
    building: location?.building ?? '',
    room: location?.room ?? '',
    cabinet: location?.cabinet ?? '',
    shelf: location?.shelf ?? '',
    mapX: location?.mapX?.toString() ?? '',
    mapY: location?.mapY?.toString() ?? '',
  });

  useEffect(() => {
    setEditingLocation(false);
    setLocationDraft({
      name: location?.name ?? '',
      kind: location?.kind ?? 'internal',
      building: location?.building ?? '',
      room: location?.room ?? '',
      cabinet: location?.cabinet ?? '',
      shelf: location?.shelf ?? '',
      mapX: location?.mapX?.toString() ?? '',
      mapY: location?.mapY?.toString() ?? '',
    });
  }, [location]);
  return (
    <section
      className="location-panel"
      aria-label="Mapa lokalizacji przedmiotu"
    >
      <div className="location-panel__summary">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <p className="location-panel__label">Szczegóły przedmiotu</p>
            <h2>{item.name}</h2>
          </div>
          <div className="td-actions">
            {canEditItem ? (
              <button className="btn btn-secondary" onClick={onEdit}>
                Edytuj przedmiot
              </button>
            ) : null}
            {canDelete ? (
              <button
                className="btn btn-danger"
                disabled={deleteLoading}
                onClick={onDelete}
                type="button"
              >
                <Trash2 size={16} />
                {deleteLoading ? 'Usuwanie...' : 'Usuń przedmiot'}
              </button>
            ) : null}
          </div>
        </div>
        <dl>
          <div>
            <dt>Producent</dt>
            <dd>{item.manufacturer}</dd>
          </div>
          {item.model && (
            <div>
              <dt>Model</dt>
              <dd>{item.model}</dd>
            </div>
          )}
          {item.serial && (
            <div>
              <dt>Nr seryjny</dt>
              <dd>{item.serial}</dd>
            </div>
          )}
          {item.inventoryNumber && (
            <div>
              <dt>Nr inwentarzowy</dt>
              <dd>{item.inventoryNumber}</dd>
            </div>
          )}
          {item.systemId && (
            <div>
              <dt>System ID</dt>
              <dd>{item.systemId}</dd>
            </div>
          )}
          {item.description && (
            <div>
              <dt>Opis</dt>
              <dd>{item.description}</dd>
            </div>
          )}
          <div>
            <dt>Status</dt>
            <dd>{statusName}</dd>
          </div>
          <div>
            <dt>Data dodania</dt>
            <dd>{formatItemDate(item.addedAt)}</dd>
          </div>
          <div>
            <dt>Data zakupu</dt>
            <dd>{formatItemDate(item.purchaseDate)}</dd>
          </div>
          <div>
            <dt>Opiekun</dt>
            <dd>{ownerName}</dd>
          </div>
          <div>
            <dt>Punkt</dt>
            <dd>{location?.name ?? 'Brak przypisanej lokalizacji'}</dd>
          </div>
          <div>
            <dt>Szczegóły</dt>
            <dd>{formatLocationDetails(location)}</dd>
          </div>
        </dl>
      </div>
      <div
        className="location-map-container"
        style={{
          padding: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <LeafletMap
            key={`${location?.id ?? 'none'}-${location?.mapX ?? 'x'}-${location?.mapY ?? 'y'}`}
            mapX={location?.mapX}
            mapY={location?.mapY}
            previewX={previewCoords?.x}
            previewY={previewCoords?.y}
            onLocationSelect={
              canEdit
                ? (x, y) => {
                    setPreviewCoords({ x, y });
                    setNewLocation((current) => ({
                      ...current,
                      mapX: x.toFixed(6),
                      mapY: y.toFixed(6),
                    }));
                  }
                : undefined
            }
          />
        </div>
      </div>
      {canEdit ? (
        <div className="location-controls">
          <div className="form">
            <label className="form-label" htmlFor="item-location-select">
              Zmień lokalizację
            </label>
            <select
              className="form-input"
              id="item-location-select"
              onChange={(event) => {
                onLocationChange(Number(event.target.value));
                setPreviewCoords(null);
              }}
              value={item.locationId}
            >
              {locations.map((currentLocation) => (
                <option key={currentLocation.id} value={currentLocation.id}>
                  {currentLocation.name}
                </option>
              ))}
            </select>
          </div>
          {location ? (
            <div className="form">
              <div className="td-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => setEditingLocation((current) => !current)}
                  type="button"
                >
                  {editingLocation
                    ? 'Anuluj edycję lokalizacji'
                    : 'Edytuj lokalizację'}
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => onDeleteLocation(location.id)}
                  type="button"
                >
                  Usuń lokalizację
                </button>
              </div>
              {editingLocation ? (
                <div className="location-controls__grid">
                  <input
                    aria-label="Nazwa lokalizacji"
                    className="form-input"
                    onChange={(event) =>
                      setLocationDraft((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Nazwa"
                    value={locationDraft.name}
                  />
                  <select
                    aria-label="Typ lokalizacji"
                    className="form-input"
                    onChange={(event) =>
                      setLocationDraft((current) => ({
                        ...current,
                        kind: event.target.value as 'internal' | 'external',
                      }))
                    }
                    value={locationDraft.kind}
                  >
                    <option value="internal">Wewnętrzna</option>
                    <option value="external">Zewnętrzna</option>
                  </select>
                  <input
                    aria-label="Budynek"
                    className="form-input"
                    onChange={(event) =>
                      setLocationDraft((current) => ({
                        ...current,
                        building: event.target.value,
                      }))
                    }
                    placeholder="Budynek"
                    value={locationDraft.building}
                  />
                  <input
                    aria-label="Pokój"
                    className="form-input"
                    onChange={(event) =>
                      setLocationDraft((current) => ({
                        ...current,
                        room: event.target.value,
                      }))
                    }
                    placeholder="Pokój"
                    value={locationDraft.room}
                  />
                  <input
                    aria-label="Szafa"
                    className="form-input"
                    onChange={(event) =>
                      setLocationDraft((current) => ({
                        ...current,
                        cabinet: event.target.value,
                      }))
                    }
                    placeholder="Szafa"
                    value={locationDraft.cabinet}
                  />
                  <input
                    aria-label="Półka"
                    className="form-input"
                    onChange={(event) =>
                      setLocationDraft((current) => ({
                        ...current,
                        shelf: event.target.value,
                      }))
                    }
                    placeholder="Półka"
                    value={locationDraft.shelf}
                  />
                  <input
                    aria-label="mapX"
                    className="form-input"
                    onChange={(event) =>
                      setLocationDraft((current) => ({
                        ...current,
                        mapX: event.target.value,
                      }))
                    }
                    type="number"
                    step="any"
                    value={locationDraft.mapX}
                  />
                  <input
                    aria-label="mapY"
                    className="form-input"
                    onChange={(event) =>
                      setLocationDraft((current) => ({
                        ...current,
                        mapY: event.target.value,
                      }))
                    }
                    type="number"
                    step="any"
                    value={locationDraft.mapY}
                  />
                  <button
                    className="btn btn-primary"
                    disabled={!locationDraft.name.trim()}
                    onClick={() => {
                      onUpdateLocation(location.id, {
                        name: locationDraft.name.trim(),
                        kind: locationDraft.kind as 'internal' | 'external',
                        building: locationDraft.building.trim() || undefined,
                        room: locationDraft.room.trim() || undefined,
                        cabinet: locationDraft.cabinet.trim() || undefined,
                        shelf: locationDraft.shelf.trim() || undefined,
                        mapX: locationDraft.mapX
                          ? Number(locationDraft.mapX)
                          : undefined,
                        mapY: locationDraft.mapY
                          ? Number(locationDraft.mapY)
                          : undefined,
                      });
                      setEditingLocation(false);
                    }}
                    type="button"
                  >
                    Zapisz lokalizację
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="form">
            <label className="form-label" htmlFor="new-location-name">
              Nowy punkt na mapie (kliknij na mapie by wybrać współrzędne)
            </label>
            <input
              className="form-input"
              id="new-location-name"
              onChange={(event) =>
                setNewLocation((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="np. D-17 / 102 / Szafa B"
              value={newLocation.name}
            />
            <div className="location-controls__grid">
              <select
                aria-label="Typ lokalizacji"
                className="form-input"
                onChange={(event) =>
                  setNewLocation((current) => ({
                    ...current,
                    kind: event.target.value as 'internal' | 'external',
                  }))
                }
                value={newLocation.kind}
              >
                <option value="internal">Wewnętrzna</option>
                <option value="external">Zewnętrzna</option>
              </select>
              <input
                aria-label="Budynek"
                className="form-input"
                onChange={(event) =>
                  setNewLocation((current) => ({
                    ...current,
                    building: event.target.value,
                  }))
                }
                placeholder="Budynek"
                value={newLocation.building}
              />
              <input
                aria-label="Pokój"
                className="form-input"
                onChange={(event) =>
                  setNewLocation((current) => ({
                    ...current,
                    room: event.target.value,
                  }))
                }
                placeholder="Pokój"
                value={newLocation.room}
              />
              <input
                aria-label="Szafa"
                className="form-input"
                onChange={(event) =>
                  setNewLocation((current) => ({
                    ...current,
                    cabinet: event.target.value,
                  }))
                }
                placeholder="Szafa"
                value={newLocation.cabinet}
              />
              <input
                aria-label="Półka"
                className="form-input"
                onChange={(event) =>
                  setNewLocation((current) => ({
                    ...current,
                    shelf: event.target.value,
                  }))
                }
                placeholder="Półka"
                value={newLocation.shelf}
              />
              <input
                aria-label="mapX (długość geo.)"
                className="form-input"
                onChange={(event) => {
                  setNewLocation((current) => ({
                    ...current,
                    mapX: event.target.value,
                  }));
                  const val = parseFloat(event.target.value);
                  if (!isNaN(val))
                    setPreviewCoords((prev) => ({
                      x: val,
                      y: prev?.y ?? 50.0646,
                    }));
                }}
                type="number"
                step="any"
                value={newLocation.mapX}
              />
              <input
                aria-label="mapY (szerokość geo.)"
                className="form-input"
                onChange={(event) => {
                  setNewLocation((current) => ({
                    ...current,
                    mapY: event.target.value,
                  }));
                  const val = parseFloat(event.target.value);
                  if (!isNaN(val))
                    setPreviewCoords((prev) => ({
                      x: prev?.x ?? 19.9236,
                      y: val,
                    }));
                }}
                type="number"
                step="any"
                value={newLocation.mapY}
              />
            </div>
            <button
              className="btn btn-secondary"
              disabled={
                !newLocation.name.trim() ||
                !newLocation.mapX ||
                !newLocation.mapY
              }
              onClick={() => {
                onCreateLocation({
                  name: newLocation.name.trim(),
                  kind: newLocation.kind,
                  building: newLocation.building.trim() || undefined,
                  room: newLocation.room.trim() || undefined,
                  cabinet: newLocation.cabinet.trim() || undefined,
                  shelf: newLocation.shelf.trim() || undefined,
                  mapX: Number(newLocation.mapX),
                  mapY: Number(newLocation.mapY),
                });
                setPreviewCoords(null);
                setNewLocation({
                  name: '',
                  kind: 'internal',
                  building: '',
                  room: '',
                  cabinet: '',
                  shelf: '',
                  mapX: '',
                  mapY: '',
                });
              }}
              type="button"
            >
              Dodaj punkt i przypisz
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div className="alert alert-info">
            Nie masz uprawnień do zmiany lokalizacji tego przedmiotu.
          </div>
        </div>
      )}
    </section>
  );
}

function formatLocationDetails(location: Location | undefined): string {
  if (!location) return '—';
  const details = [
    location.building,
    location.room,
    location.cabinet,
    location.shelf,
  ]
    .filter(Boolean)
    .join(' / ');
  return (
    details || (location.kind === 'external' ? 'Lokalizacja zewnętrzna' : '—')
  );
}

function formatItemDate(value: string | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('pl-PL');
}

function ItemPhotosPanel({
  item,
  photos: itemPhotos,
  error: photosError,
  loading: photosLoading,
  onUpload,
}: {
  item: Item;
  photos: ItemPhoto[];
  error: string | null;
  loading: boolean;
  onUpload: (file: File) => void;
}) {
  return (
    <section className="photos-panel">
      <div>
        <p className="location-panel__label">Dokumentacja zdjęciowa</p>
        <h2>{item.name}</h2>
      </div>
      <label className="btn btn-secondary photos-upload">
        Dodaj zdjęcie
        <input
          accept="image/*"
          type="file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onUpload(file);
            event.target.value = '';
          }}
        />
      </label>
      {photosError ? (
        <div className="alert alert-error">{photosError}</div>
      ) : null}
      {photosLoading ? (
        <div className="loading-state">
          <div className="spinner" />
          Ładowanie zdjęć...
        </div>
      ) : (
        <table className="table photos-table">
          <thead>
            <tr>
              <th>Plik</th>
              <th>Typ</th>
              <th>Dodano</th>
              <th>Użytkownik</th>
            </tr>
          </thead>
          <tbody>
            {itemPhotos.length === 0 ? (
              <tr>
                <td colSpan={4}>Brak zdjęć dla tego przedmiotu.</td>
              </tr>
            ) : (
              itemPhotos.map((photo) => (
                <tr key={photo.id}>
                  <td>
                    <button
                      className="btn btn-link"
                      type="button"
                      onClick={() =>
                        void itemPhotoService.download(item.id, photo)
                      }
                    >
                      {photo.originalFilename}
                    </button>
                  </td>
                  <td>{photo.contentType}</td>
                  <td>{new Date(photo.addedAt).toLocaleString('pl-PL')}</td>
                  <td>{photo.uploadedByName || photo.uploadedById}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}

function ItemDelegationsPanel({
  item,
  delegations,
  canManage,
  onCreate,
  onUpdate,
  onDelete,
}: {
  item: Item;
  delegations: Delegation[];
  canManage: boolean;
  onCreate: (payload: CreateDelegationPayload) => void;
  onUpdate: (id: number, payload: CreateDelegationPayload) => void;
  onDelete: (id: number) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [delegationError, setDelegationError] = useState<string | null>(null);

  const handleCreate = async (payload: CreateDelegationPayload) => {
    setDelegationError(null);
    try {
      await onCreate(payload);
      setShowForm(false);
    } catch (err) {
      setDelegationError(
        err instanceof Error ? err.message : 'Nie udało się dodać delegacji.'
      );
    }
  };

  const handleUpdate = async (payload: CreateDelegationPayload) => {
    if (!editingId) return;
    setDelegationError(null);
    try {
      await onUpdate(editingId, payload);
      setEditingId(null);
    } catch (err) {
      setDelegationError(
        err instanceof Error
          ? err.message
          : 'Nie udało się zaktualizować delegacji.'
      );
    }
  };

  return (
    <section className="photos-panel">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <p className="location-panel__label">Delegacje i uprawnienia</p>
          <h2>Kto ma dostęp do: {item.name}?</h2>
        </div>
        {canManage && (
          <button
            className="btn btn-secondary"
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
            }}
          >
            {showForm ? 'Anuluj' : 'Dodaj delegata'}
          </button>
        )}
      </div>

      {delegationError && (
        <div className="alert alert-error" style={{ marginTop: '1rem' }}>
          {delegationError}
        </div>
      )}

      {(showForm || editingId) && canManage && (
        <div
          style={{
            padding: '16px',
            background: 'var(--surface-2)',
            borderRadius: 'var(--radius)',
            margin: '16px 0',
            border: '1px solid var(--border)',
          }}
        >
          <CreateDelegationForm
            initial={
              editingId
                ? delegations.find((d) => d.id === editingId)
                : undefined
            }
            onSubmit={editingId ? handleUpdate : handleCreate}
          />
        </div>
      )}

      {delegations.length === 0 ? (
        <div className="alert alert-info" style={{ marginTop: '1rem' }}>
          Brak dodatkowych delegacji dla tego przedmiotu.
        </div>
      ) : (
        <table className="table photos-table" style={{ marginTop: '1rem' }}>
          <thead>
            <tr>
              <th>Użytkownik</th>
              <th>Grupa</th>
              <th>Uprawnienie</th>
              {canManage && <th>Akcje</th>}
            </tr>
          </thead>
          <tbody>
            {delegations.map((d) => (
              <tr key={d.id}>
                <td style={{ fontWeight: d.user_email ? 500 : 'normal' }}>
                  {d.user_email ?? '—'}
                </td>
                <td
                  style={{ color: d.group_name ? 'var(--accent)' : 'inherit' }}
                >
                  {d.group_name ?? '—'}
                </td>
                <td>
                  <span className={`badge badge-${d.permission}`}>
                    {d.permission === 'manage' ? 'Zarządzanie' : 'Edycja'}
                  </span>
                </td>
                {canManage && (
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => {
                          setEditingId(d.id);
                          setShowForm(false);
                        }}
                      >
                        Edytuj
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => {
                          if (
                            confirm(
                              `Usunąć delegację dla: ${d.user_email || ''} ${d.group_name || ''}?`
                            )
                          )
                            onDelete(d.id);
                        }}
                      >
                        Usuń
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function CreateDelegationForm({
  initial,
  onSubmit,
}: {
  initial?: Delegation;
  onSubmit: (p: CreateDelegationPayload) => void;
}) {
  const [selectedUser, setSelectedUser] = useState<AutocompleteOption | null>(
    initial?.user_id
      ? { value: initial.user_id, label: initial.user_email || '' }
      : null
  );
  const [selectedGroup, setSelectedGroup] = useState<AutocompleteOption | null>(
    initial?.group_id
      ? { value: initial.group_id, label: initial.group_name || '' }
      : null
  );
  const [customGroupName, setCustomGroupName] = useState(
    initial?.group_name || ''
  );
  const [permission, setPermission] = useState<PermissionLevel>(
    initial?.permission || 'edit'
  );
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  const isExistingGroupSelected = !!selectedGroup;

  const handleGroupSelect = (opt: AutocompleteOption) => {
    setSelectedGroup(opt);
    setCustomGroupName(opt.label);
    if (opt.extra?.defaultPermission) {
      setPermission(opt.extra.defaultPermission);
    }
  };

  const submit = async () => {
    if (!selectedUser && !selectedGroup && !customGroupName.trim()) return;

    setIsCreatingGroup(true);
    try {
      let groupId = selectedGroup?.value;

      // If typing a new name, create the group with the currently selected permission
      if (customGroupName.trim() && !groupId) {
        const group = await delegationService.searchAndCreateGroup(
          customGroupName.trim(),
          permission
        );
        groupId = group.value;
      }

      // If both user and group are provided, sync membership
      if (selectedUser && groupId) {
        try {
          await fetch(`/api/v1/groups/${groupId}/members`, {
            method: 'POST',
            headers: jsonAuthHeaders(),
            body: JSON.stringify({ userId: selectedUser.value, permission }),
          });
        } catch (e) {
          console.warn('Membership sync failed, but proceeding.', e);
        }
      }

      onSubmit({
        user_id: selectedUser?.value,
        group_id: groupId,
        permission,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Błąd zapisu delegacji.');
    } finally {
      setIsCreatingGroup(false);
    }
  };

  return (
    <div className="form">
      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}
      >
        <div>
          <label className="form-label">Użytkownik (email)</label>
          <Autocomplete
            placeholder="Wpisz email..."
            onSearch={(q) => delegationService.searchUsers(q)}
            onSelect={(opt) => setSelectedUser(opt)}
            onClear={() => setSelectedUser(null)}
            initialValue={initial?.user_email || ''}
            disabled={!!initial}
          />
        </div>
        <div>
          <label className="form-label">Lub grupa</label>
          <Autocomplete
            placeholder="Wpisz nazwę grupy..."
            onSearch={(q) => {
              setCustomGroupName(q);
              return delegationService.searchGroups(q);
            }}
            onSelect={handleGroupSelect}
            onClear={() => {
              setSelectedGroup(null);
              setCustomGroupName('');
            }}
            initialValue={initial?.group_name || ''}
            disabled={false}
          />
        </div>
      </div>

      <label className="form-label" style={{ marginTop: '16px' }}>
        Poziom uprawnień{' '}
        {isExistingGroupSelected && (
          <span style={{ fontSize: '0.8em', color: 'gray' }}>
            (dziedziczone z grupy)
          </span>
        )}
      </label>
      <select
        className="form-input"
        value={permission}
        onChange={(e) => setPermission(e.target.value as PermissionLevel)}
        disabled={isExistingGroupSelected}
      >
        <option value="edit">Edycja (tylko szczegóły)</option>
        <option value="manage">Zarządzanie (szczegóły + lokalizacja)</option>
      </select>

      <div style={{ marginTop: '16px' }}>
        <button
          className="btn btn-primary"
          onClick={submit}
          disabled={
            isCreatingGroup ||
            (!selectedUser && !selectedGroup && !customGroupName.trim())
          }
        >
          {isCreatingGroup
            ? 'Zapisywanie...'
            : initial
              ? 'Zapisz zmiany'
              : 'Dodaj delegację'}
        </button>
      </div>
    </div>
  );
}

function CreateForm({
  categories,
  groups,
  locations,
  owners,
  statuses,
  onSubmit,
  loading,
  currentUser,
}: {
  categories: Category[];
  groups: Group[];
  locations: Location[];
  owners: Owner[];
  statuses: Status[];
  onSubmit: (p: CreateItemPayload) => void;
  loading: boolean;
  currentUser: AuthUser | null;
}) {
  const defaultOwnerId = useMemo(() => {
    if (currentUser && owners.some((o) => o.id === currentUser.id))
      return currentUser.id;
    return owners[0]?.id ?? '';
  }, [currentUser, owners]);

  const [ownerType, setOwnerType] = useState<'person' | 'group'>('person');

  const [name, setName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [serial, setSerial] = useState('');
  const [inventoryNumber, setInventoryNumber] = useState('');
  const [description, setDescription] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>(
    categories[0]?.id ?? ''
  );
  const [statusId, setStatusId] = useState<number | ''>(statuses[0]?.id ?? '');
  const [locationId, setLocationId] = useState<number | ''>(
    locations[0]?.id ?? ''
  );
  const [ownerId, setOwnerId] = useState<number | ''>(defaultOwnerId);
  const [ownerGroupId, setOwnerGroupId] = useState('');

  const handleOwnerTypeChange = (newType: 'person' | 'group') => {
    setOwnerType(newType);
    if (newType === 'person') {
      setOwnerGroupId('');
      if (ownerId === '') setOwnerId(defaultOwnerId);
    } else if (newType === 'group') {
      setOwnerId('');
      if (ownerGroupId === '') setOwnerGroupId(groups[0]?.id.toString() ?? '');
    }
  };

  const submit = () => {
    if (!name.trim()) return;
    const payload: CreateItemPayload = {
      name: name.trim(),
      manufacturer: manufacturer.trim() || undefined,
      model: model.trim() || undefined,
      serial: serial.trim() || undefined,
      inventoryNumber: inventoryNumber.trim() || undefined,
      description: description.trim() || undefined,
      purchaseDate: purchaseDate || undefined,
    };
    if (categoryId !== '' && categoryId > 0) payload.categoryId = categoryId;
    if (statusId !== '' && statusId > 0) payload.statusId = statusId;
    if (locationId !== '' && locationId > 0) payload.locationId = locationId;
    if (ownerType === 'person') {
      payload.ownerId = ownerId !== '' ? ownerId : undefined;
    } else if (ownerType === 'group') {
      payload.ownerGroupId = ownerGroupId ? Number(ownerGroupId) : undefined;
    }
    onSubmit(payload);
  };

  return (
    <div className="form">
      <label className="form-label">Nazwa *</label>
      <input
        className="form-input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="np. Oscyloskop Tektronix"
      />
      <label className="form-label">Producent</label>
      <input
        className="form-input"
        value={manufacturer}
        onChange={(e) => setManufacturer(e.target.value)}
        placeholder="np. Tektronix"
      />
      <label className="form-label">Model</label>
      <input
        className="form-input"
        value={model}
        onChange={(e) => setModel(e.target.value)}
        placeholder="np. TBS1102"
      />
      <label className="form-label">Nr seryjny</label>
      <input
        className="form-input"
        value={serial}
        onChange={(e) => setSerial(e.target.value)}
        placeholder="np. MY52430015"
      />
      <label className="form-label">Nr inwentarzowy</label>
      <input
        className="form-input"
        value={inventoryNumber}
        onChange={(e) => setInventoryNumber(e.target.value)}
        placeholder="np. W7/262"
      />
      <label className="form-label">Opis</label>
      <textarea
        className="form-input"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Opcjonalny opis"
      />
      <label className="form-label">Data zakupu</label>
      <input
        type="date"
        className="form-input"
        value={purchaseDate}
        onChange={(e) => setPurchaseDate(e.target.value)}
      />
      <label className="form-label">Kategoria</label>
      <CategoryDropdown
        categories={categories}
        value={categoryId}
        onChange={(val) => setCategoryId(val)}
        allowEmpty
        emptyLabel="Brak"
      />
      <label className="form-label">Status</label>
      <select
        className="form-input"
        value={statusId}
        onChange={(e) =>
          setStatusId(e.target.value ? Number(e.target.value) : '')
        }
      >
        <option value="">Brak</option>
        {statuses.map((status) => (
          <option key={status.id} value={status.id}>
            {status.name}
          </option>
        ))}
      </select>
      <label className="form-label">Lokalizacja</label>
      <select
        className="form-input"
        value={locationId}
        onChange={(e) =>
          setLocationId(e.target.value ? Number(e.target.value) : '')
        }
      >
        <option value="">Brak</option>
        {locations.map((location) => (
          <option key={location.id} value={location.id}>
            {location.name}
          </option>
        ))}
      </select>

      <label className="form-label">Typ opiekuna</label>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
        <label>
          <input
            type="radio"
            name="ownerType"
            value="person"
            checked={ownerType === 'person'}
            onChange={() => handleOwnerTypeChange('person')}
          />{' '}
          Osoba
        </label>
        <label>
          <input
            type="radio"
            name="ownerType"
            value="group"
            checked={ownerType === 'group'}
            onChange={() => handleOwnerTypeChange('group')}
          />{' '}
          Grupa
        </label>
      </div>

      {ownerType === 'person' && (
        <>
          <label className="form-label">Opiekun</label>
          <select
            className="form-input"
            value={ownerId}
            onChange={(e) =>
              setOwnerId(e.target.value ? Number(e.target.value) : '')
            }
          >
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.fullName}
              </option>
            ))}
          </select>
        </>
      )}
      {ownerType === 'group' && (
        <>
          <label className="form-label">Grupa opiekunów</label>
          <select
            className="form-input"
            value={ownerGroupId}
            onChange={(e) => setOwnerGroupId(e.target.value)}
          >
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </>
      )}

      <div className="form-actions">
        <button
          className="btn btn-primary"
          onClick={submit}
          disabled={loading || !name.trim()}
        >
          {loading ? 'Zapisywanie…' : 'Utwórz'}
        </button>
      </div>
    </div>
  );
}

function EditForm({
  item,
  categories,
  groups,
  owners,
  statuses,
  onSubmit,
  loading,
  permissionLevel,
}: {
  item: Item;
  categories: Category[];
  groups: Group[];
  owners: Owner[];
  statuses: Status[];
  onSubmit: (itemId: number, payload: Partial<CreateItemPayload>) => void;
  loading: boolean;
  permissionLevel: 'admin' | 'owner' | 'manage' | 'edit' | null;
}) {
  const [name, setName] = useState(item.name);
  const [manufacturer, setManufacturer] = useState(item.manufacturer);
  const [model, setModel] = useState(item.model ?? '');
  const [serial, setSerial] = useState(item.serial ?? '');
  const [inventoryNumber, setInventoryNumber] = useState(
    item.inventoryNumber ?? ''
  );
  const [description, setDescription] = useState(item.description ?? '');
  const [purchaseDate, setPurchaseDate] = useState(item.purchaseDate ?? '');
  const [categoryId, setCategoryId] = useState(
    item.categoryId ?? categories[0]?.id ?? 1
  );
  const [statusId, setStatusId] = useState(
    item.statusId ?? statuses[0]?.id ?? 1
  );

  const initialOwnerType: 'person' | 'group' = item.ownerGroupId
    ? 'group'
    : 'person';

  const [ownerType, setOwnerType] = useState<'person' | 'group'>(
    initialOwnerType
  );
  const [ownerId, setOwnerId] = useState<number>(
    item.ownerId ?? owners[0]?.id ?? 1
  );
  const [ownerGroupId, setOwnerGroupId] = useState(
    item.ownerGroupId ? String(item.ownerGroupId) : ''
  );

  useEffect(() => {
    setName(item.name);
    setManufacturer(item.manufacturer);
    setModel(item.model ?? '');
    setSerial(item.serial ?? '');
    setInventoryNumber(item.inventoryNumber ?? '');
    setDescription(item.description ?? '');
    setPurchaseDate(item.purchaseDate ?? '');
    setCategoryId(item.categoryId ?? categories[0]?.id ?? 1);
    setStatusId(item.statusId ?? statuses[0]?.id ?? 1);
    setOwnerId(item.ownerId ?? owners[0]?.id ?? 1);
    setOwnerGroupId(item.ownerGroupId ? String(item.ownerGroupId) : '');
    const ot = item.ownerGroupId ? 'group' : 'person';
    setOwnerType(ot);
  }, [item, categories, owners, statuses]);

  const showAllFields =
    permissionLevel === 'admin' ||
    permissionLevel === 'owner' ||
    permissionLevel === 'manage';
  const canEditOwner =
    permissionLevel === 'admin' || permissionLevel === 'owner';

  const handleOwnerTypeChange = (newType: 'person' | 'group') => {
    setOwnerType(newType);
    if (newType === 'person') {
      setOwnerGroupId('');
      if (!ownerId) setOwnerId(owners[0]?.id ?? 1);
    } else if (newType === 'group') {
      setOwnerId(0);
      if (!ownerGroupId) setOwnerGroupId(groups[0]?.id.toString() ?? '');
    }
  };

  const submit = () => {
    if (!name.trim()) return;
    const payload: Partial<CreateItemPayload> = {};
    // Always include description and status, as edit allows them
    payload.description = description.trim() || undefined;
    if (statusId && statusId > 0) payload.statusId = statusId;
    if (showAllFields) {
      payload.name = name.trim();
      payload.manufacturer = manufacturer.trim() || undefined;
      payload.model = model.trim() || undefined;
      payload.serial = serial.trim() || undefined;
      payload.inventoryNumber = inventoryNumber.trim() || undefined;
      payload.purchaseDate = purchaseDate || undefined;
      if (categoryId && categoryId > 0) payload.categoryId = categoryId;
    }
    if (canEditOwner) {
      if (ownerType === 'person') {
        payload.ownerId = ownerId;
        payload.ownerGroupId = null;
      } else if (ownerType === 'group') {
        payload.ownerGroupId = ownerGroupId ? Number(ownerGroupId) : null;
        payload.ownerId = null;
      }
    }
    onSubmit(item.id, payload);
  };

  return (
    <div className="form">
      {permissionLevel === 'edit' && (
        <>
          <label className="form-label">Opis</label>
          <textarea
            className="form-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <label className="form-label">Status *</label>
          <select
            className="form-input"
            value={statusId}
            onChange={(e) => setStatusId(Number(e.target.value))}
          >
            {statuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </select>
        </>
      )}
      {showAllFields && (
        <>
          <label className="form-label">Nazwa *</label>
          <input
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <label className="form-label">Producent</label>
          <input
            className="form-input"
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
          />
          <label className="form-label">Model</label>
          <input
            className="form-input"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          />
          <label className="form-label">Nr seryjny</label>
          <input
            className="form-input"
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
          />
          <label className="form-label">Nr inwentarzowy</label>
          <input
            className="form-input"
            value={inventoryNumber}
            onChange={(e) => setInventoryNumber(e.target.value)}
          />
          <label className="form-label">Opis</label>
          <textarea
            className="form-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <label className="form-label">Data zakupu</label>
          <input
            type="date"
            className="form-input"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
          />
          <label className="form-label">Kategoria *</label>
          <CategoryDropdown
            categories={categories}
            value={categoryId}
            onChange={(val) =>
              setCategoryId(val === '' ? categories[0]?.id || 1 : val)
            }
            allowEmpty={false}
          />
          <label className="form-label">Status *</label>
          <select
            className="form-input"
            value={statusId}
            onChange={(e) => setStatusId(Number(e.target.value))}
          >
            {statuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </select>
        </>
      )}
      {canEditOwner && (
        <>
          <label className="form-label">Typ opiekuna</label>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
            <label>
              <input
                type="radio"
                name="editOwnerType"
                value="person"
                checked={ownerType === 'person'}
                onChange={() => handleOwnerTypeChange('person')}
              />{' '}
              Osoba
            </label>
            <label>
              <input
                type="radio"
                name="editOwnerType"
                value="group"
                checked={ownerType === 'group'}
                onChange={() => handleOwnerTypeChange('group')}
              />{' '}
              Grupa
            </label>
          </div>
          {ownerType === 'person' && (
            <>
              <label className="form-label">Opiekun</label>
              <select
                className="form-input"
                value={ownerId}
                onChange={(e) => setOwnerId(Number(e.target.value))}
              >
                {owners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.fullName}
                  </option>
                ))}
              </select>
            </>
          )}
          {ownerType === 'group' && (
            <>
              <label className="form-label">Grupa opiekunów</label>
              <select
                className="form-input"
                value={ownerGroupId}
                onChange={(e) => setOwnerGroupId(e.target.value)}
              >
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </>
          )}
        </>
      )}

      <div className="form-actions">
        <button
          className="btn btn-primary"
          onClick={submit}
          disabled={loading || !name.trim()}
        >
          {loading ? 'Zapisywanie…' : 'Zapisz zmiany'}
        </button>
      </div>
    </div>
  );
}
