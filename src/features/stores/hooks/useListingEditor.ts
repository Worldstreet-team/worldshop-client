import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { categoryService } from '@/features/catalog/api';
import type { Category } from '@/features/catalog/types';
import type {
  CategoryFormSpec,
  CustomField,
  Listing,
  ListingPayload,
  ListingVariant,
  PriceType,
} from '@/features/stores/api';
import { type ImageRef } from '@/features/listings/model';
import { useListingApi } from '@/features/stores/context/ListingApiContext';
import { mapServerFieldPath } from '@/features/stores/listingRules';
import { useUIStore } from '@/shared/store/uiStore';
import { toApiError } from '@/shared/lib/api';

/** Matches the server: a deal may end at most this many days out. */
export const MAX_DEAL_DAYS = 30;

/** YYYY-MM-DD in the vendor's own time zone, as a date input wants it. */
export function toLocalDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** A deal "ends on the 12th" means it runs through the 12th, local time. */
export function endOfDay(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59);
}

/** The first problem with a deal as entered, or null. Mirrors the API's dealProblem. */
export function dealError(v: {
  priceType: string;
  basePrice: string;
  onDeal: boolean;
  compareAtPrice: string;
  dealEndsOn: string;
}): { field: 'compareAtPrice' | 'dealEndsOn'; message: string } | null {
  if (!v.onDeal || v.priceType !== 'FIXED') return null;
  if (v.compareAtPrice === '') return { field: 'compareAtPrice', message: 'Enter the price before the deal.' };
  if (v.basePrice !== '' && Number(v.compareAtPrice) <= Number(v.basePrice)) {
    return { field: 'compareAtPrice', message: 'This must be higher than your price, or there is no saving.' };
  }
  if (!v.dealEndsOn) return { field: 'dealEndsOn', message: 'Choose when the deal ends.' };
  const end = endOfDay(v.dealEndsOn).getTime();
  if (end <= Date.now()) return { field: 'dealEndsOn', message: 'The end date has already passed.' };
  if (end - Date.now() > MAX_DEAL_DAYS * 86_400_000 + 86_400_000) {
    return { field: 'dealEndsOn', message: `A deal can run for at most ${MAX_DEAL_DAYS} days.` };
  }
  return null;
}

const errMessage = (err: unknown, fallback: string) => toApiError(err, fallback).message;

export function useListingEditor() {
  const { id } = useParams<{ id: string }>();
  const { api: listingService, productsBasePath } = useListingApi();
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);
  const isNew = !id || id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [spec, setSpec] = useState<CategoryFormSpec | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
    const [problems, setProblems] = useState<string[] | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priceType, setPriceType] = useState<PriceType>('FIXED');
  const [basePrice, setBasePrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [isNegotiable, setIsNegotiable] = useState(true);
  // A vendor-set deal: the price before it and the last day it runs.
  const [onDeal, setOnDeal] = useState(false);
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [dealEndsOn, setDealEndsOn] = useState(''); // YYYY-MM-DD, local
  const [condition, setCondition] = useState('');
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [tags, setTags] = useState('');
  const [images, setImages] = useState<ImageRef[]>([]);
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [variants, setVariants] = useState<ListingVariant[]>([]);

      const parents = useMemo(() => {
    const withChildren = new Set(categories.map((c) => c.parentId).filter(Boolean));
    return categories.filter((c) => !c.parentId && withChildren.has(c.id));
  }, [categories]);
  const children = useMemo(
    () => categories.filter((c) => c.parentId === parentId),
    [categories, parentId],
  );

  const productAttrs = useMemo(
    () => spec?.attributes.filter((a) => a.appliesTo === 'PRODUCT') ?? [],
    [spec],
  );
  const variantAttrs = useMemo(
    () => spec?.attributes.filter((a) => a.appliesTo === 'VARIANT') ?? [],
    [spec],
  );

  useEffect(() => {
    categoryService
      .getCategories()
      .then(setCategories)
      .catch(() => addToast({ type: 'error', message: 'Could not load categories' }));
  }, [addToast]);

  useEffect(() => {
    if (isNew) return;
    let cancelled = false;

    listingService
      .get(id!)
      .then((res) => {
        if (cancelled) return;
        const l = res.data;
        setListing(l);
        setName(l.name);
        setDescription(l.description);
        setCategoryId(l.categoryId ?? '');
        setPriceType(l.priceType);
        setBasePrice(l.basePrice != null ? String(l.basePrice) : '');
        setMaxPrice(l.maxPrice != null ? String(l.maxPrice) : '');
        setIsNegotiable(l.isNegotiable);
        // An ended deal loads as no deal, so re-saving does not resubmit it.
        const live = l.compareAtPrice != null && !!l.dealEndsAt && new Date(l.dealEndsAt) > new Date();
        setOnDeal(live);
        setCompareAtPrice(live ? String(l.compareAtPrice) : '');
        setDealEndsOn(live ? toLocalDate(new Date(l.dealEndsAt!)) : '');
        setCondition(l.condition ?? '');
        setCountry(l.country ?? '');
        setState(l.state ?? '');
        setCity(l.city ?? '');
        setTags(l.tags.join(', '));
        setImages((l.images as ImageRef[]) ?? []);
        setAttributes(l.attributes ?? {});
        setCustomFields(l.customFields ?? []);
        setVariants(l.variants ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) addToast({ type: 'error', message: errMessage(err, 'Listing not found') });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    }, [id, isNew, addToast, listingService]);

  useEffect(() => {
    if (!categoryId || !categories.length || parentId) return;
    const own = categories.find((c) => c.id === categoryId);
    if (own?.parentId) setParentId(own.parentId);
  }, [categoryId, categories, parentId]);

    useEffect(() => {
    if (!categoryId) {
      setSpec(null);
      return;
    }
    let cancelled = false;

    listingService
      .getFormSpec(categoryId)
      .then((res) => {
        if (!cancelled) setSpec(res.data);
      })
      .catch(() => {
        if (!cancelled) setSpec(null);
      });

    return () => {
      cancelled = true;
    };
  }, [categoryId, listingService]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const res = await listingService.uploadImages(Array.from(files));
      setImages((prev) => [...prev, ...(res.data as ImageRef[])]);
    } catch (err: unknown) {
      addToast({ type: 'error', message: errMessage(err, 'Image upload failed') });
    } finally {
      setUploading(false);
    }
  };

  const validateForm = useCallback(
    (thenPublish: boolean): Record<string, string> => {
      const errors: Record<string, string> = {};

      if (name.trim().length < 3) errors.name = 'Product name must be at least 3 characters.';
      if (description.trim().length < 20) errors.description = 'Describe the product in at least 20 characters.';
      if (!parentId) errors.category = 'Choose a category.';
      else if (!categoryId) errors.category = 'Choose a subcategory.';

      if (priceType === 'FIXED' && basePrice === '') {
        errors.basePrice = 'A price is required.';
      }
      if (priceType === 'RANGE') {
        if (basePrice === '') errors.basePrice = 'A price range needs a minimum.';
        if (maxPrice === '') errors.maxPrice = 'A price range needs a maximum.';
        if (basePrice !== '' && maxPrice !== '' && Number(maxPrice) < Number(basePrice)) {
          errors.maxPrice = 'Maximum price cannot be below the minimum.';
        }
      }

      const deal = dealError({ priceType, basePrice, onDeal, compareAtPrice, dealEndsOn });
      if (deal) errors[deal.field] = deal.message;

      if (thenPublish) {
        if (images.length === 0) errors.images = 'At least one photo is required to publish.';
        for (const attr of productAttrs) {
          if (attr.isRequired && !(attributes[attr.name] ?? '').trim()) {
            errors[`attr-${attr.name}`] = `${attr.name} is required.`;
          }
        }
        variants.forEach((variant, i) => {
          for (const attr of variantAttrs) {
            if (attr.isRequired && !(variant.attributes[attr.name] ?? '').trim()) {
              errors.variants = errors.variants ?? `Variant ${i + 1} is missing ${attr.name}.`;
            }
          }
        });
      }

      return errors;
    },
    [name, description, parentId, categoryId, priceType, basePrice, maxPrice, onDeal, compareAtPrice,
      dealEndsOn, images, productAttrs, attributes, variants, variantAttrs],
  );

  const save = useCallback(
    async (thenPublish: boolean) => {
      setProblems(null);
      setFieldErrors({});

      const clientErrors = validateForm(thenPublish);
      if (Object.keys(clientErrors).length > 0) {
        setFieldErrors(clientErrors);
        setProblems(Object.values(clientErrors));
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const payload: ListingPayload = {
        name: name.trim(),
        description: description.trim(),
        categoryId,
        priceType,
        basePrice: basePrice === '' ? undefined : Number(basePrice),
        maxPrice: maxPrice === '' ? undefined : Number(maxPrice),
        isNegotiable,
        // Sent as null when off, so turning a deal off clears it on the server.
        ...(priceType === 'FIXED' && onDeal
          ? { compareAtPrice: Number(compareAtPrice), dealEndsAt: endOfDay(dealEndsOn).toISOString() }
          : { compareAtPrice: null, dealEndsAt: null }),
        condition: condition || undefined,
        country: country || undefined,
        state: state || undefined,
        city: city || undefined,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        images,
                      attributes: Object.fromEntries(Object.entries(attributes).filter(([, v]) => v !== '')),
        customFields: customFields.filter((f) => f.label.trim() && f.value.trim()),
        variants,
      };

      setSaving(true);
      try {
        const saved = isNew
          ? await listingService.create(payload)
          : await listingService.update(id!, payload);

        if (thenPublish) {
          const res = await listingService.publish(saved.data.id);
          addToast({ type: 'success', message: res.message ?? 'Listing published' });
        } else {
          addToast({ type: 'success', message: isNew ? 'Listing saved as draft' : 'Listing updated' });
        }
        navigate(productsBasePath);
      } catch (err: unknown) {
                                    const apiErr = toApiError(err, 'Could not save this listing');
        if (apiErr.errors && Object.keys(apiErr.errors).length > 0) {
          const mapped: Record<string, string> = {};
          const lines: string[] = [];
          for (const [path, msg] of Object.entries(apiErr.errors)) {
            const { field, label } = mapServerFieldPath(path);
            mapped[field] = mapped[field] ?? msg;
            lines.push(`${label}: ${msg}`);
          }
          setFieldErrors(mapped);
          setProblems(lines);
        } else {
          setProblems([apiErr.message]);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } finally {
        setSaving(false);
      }
    },
    [name, description, categoryId, priceType, basePrice, maxPrice, isNegotiable, onDeal,
      compareAtPrice, dealEndsOn, condition, country, state, city, tags, images, attributes,
      customFields, variants, isNew, id, addToast, navigate, validateForm],
  );

  return {
    productsBasePath,
    navigate,
    addToast,
    isNew,
    loading,
    setLoading,
    saving,
    setSaving,
    uploading,
    setUploading,
    categories,
    setCategories,
    spec,
    setSpec,
    listing,
    setListing,
    problems,
    setProblems,
    fieldErrors,
    setFieldErrors,
    name,
    setName,
    description,
    setDescription,
    parentId,
    setParentId,
    categoryId,
    setCategoryId,
    priceType,
    setPriceType,
    basePrice,
    setBasePrice,
    maxPrice,
    setMaxPrice,
    isNegotiable,
    setIsNegotiable,
    onDeal,
    setOnDeal,
    compareAtPrice,
    setCompareAtPrice,
    dealEndsOn,
    setDealEndsOn,
    condition,
    setCondition,
    country,
    setCountry,
    state,
    setState,
    city,
    setCity,
    tags,
    setTags,
    images,
    setImages,
    attributes,
    setAttributes,
    customFields,
    setCustomFields,
    variants,
    setVariants,
    parents,
    children,
    productAttrs,
    variantAttrs,
    handleUpload,
    validateForm,
    save,
  };
}
