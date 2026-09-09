import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  X,
  ArrowLeft,
  Camera,
  Trash2,
  ChevronRight,
  Lock,
  MapPin,
  Check,
  Search,
  Tag,
  Truck,
  FileText,
  Settings,
  Car,
  Fuel,
  Calendar,
  Layers,
  Sparkles,
  Package,
  Wrench,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Pencil
} from "lucide-react";
import { SparePart, INDIAN_CAR_BRANDS, CAR_PART_CATEGORIES, CAR_SPARE_PARTS_BY_CATEGORY, DEFAULT_MODEL_VARIANTS } from "../types";
import { uploadProductImage, subscribeToTaxonomyConfig, deleteSparePartListing } from "../lib/firebase";
import { useLanguage } from "../lib/LanguageContext";
import { compressImageFile } from "../utils/imageCompressor";
import Category3DIcon from "./Category3DIcon";
import BrandLogo from "./BrandLogo";

interface EditListingModalProps {
  part: SparePart;
  onClose: () => void;
  onSave: (partId: string, updates: Partial<SparePart>) => Promise<void>;
  onDelete?: (partId: string) => Promise<void>;
}

// Canonical real automotive categories matching SellScreen and Reference UI
const REAL_CATEGORIES = [
  "Engine & Mechanical",
  "Body & Exterior",
  "Lights & Electricals",
  "Suspension & Brakes",
  "Interior & Wheels",
  "Cooling & AC",
  "Transmission & Clutch",
  "Exhaust & Fuel",
];

const FUEL_TYPES = ["Petrol", "Diesel", "CNG", "Electric", "Hybrid", "All / Any"];

const YEARS = Array.from({ length: 27 }, (_, i) => String(2026 - i));

const CONDITION_OPTIONS = [
  { id: "Used / OEM", label: "Used / OEM", desc: "Pre-owned genuine or verified spare part" },
  { id: "Brand New", label: "Brand New", desc: "Fresh in box / uninstalled original part" },
];

export default function EditListingModal({ part, onClose, onSave, onDelete }: EditListingModalProps) {
  const { t } = useLanguage();

  // Primary fields
  const [title, setTitle] = useState(part.title || "");
  const [price, setPrice] = useState(
    part.price !== undefined && part.price !== null ? String(part.price) : ""
  );

  // Specifications
  const [category, setCategory] = useState(part.category || "Body & Exterior");
  const [condition, setCondition] = useState(part.condition || "Used / OEM");
  const [carBrand, setCarBrand] = useState(part.carBrand || "Maruti Suzuki");
  const [carModel, setCarModel] = useState(part.carModel || "Swift");
  const [carVariant, setCarVariant] = useState(part.carVariant || "");
  const [carYear, setCarYear] = useState(
    (part as any).carYear ? String((part as any).carYear) : (part as any).year ? String((part as any).year) : "2023"
  );
  const [fuelType, setFuelType] = useState((part as any).fuelType || "Petrol");
  const [description, setDescription] = useState(part.description || "");

  // Photos
  const [uploadedImages, setUploadedImages] = useState<string[]>(() => {
    if (part.imageUrls && part.imageUrls.length > 0) return part.imageUrls.filter(Boolean);
    if (part.images && part.images.length > 0) return part.images.filter(Boolean);
    if (part.imageUrl) return [part.imageUrl];
    return [];
  });

  // Location (Locked as per demo image)
  const lockedLocation =
    part.location ||
    (part.district && part.state ? `${part.district}, ${part.state}` : "") ||
    part.district ||
    part.state ||
    "Begambur, Dindigul";

  // State Management
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Active Bottom Sheet
  const [activeSheet, setActiveSheet] = useState<
    "category" | "condition" | "brand" | "model" | "variant" | "year" | "fuel" | "description" | null
  >(null);
  const [sheetSearchQuery, setSheetSearchQuery] = useState("");
  const [tempDescInput, setTempDescInput] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Taxonomy
  const [taxonomy, setTaxonomy] = useState<{
    categories: string[];
    brands: Record<string, string[]>;
    subcategories: Record<string, string[]>;
    variants: Record<string, string[]>;
  }>({
    categories: [],
    brands: {},
    subcategories: {},
    variants: {},
  });

  useEffect(() => {
    const unsub = subscribeToTaxonomyConfig((full) => {
      setTaxonomy({
        categories: full.categories || [],
        brands: full.brands || {},
        subcategories: full.subcategories || {},
        variants: full.variants || {},
      });
    });
    return () => unsub();
  }, []);

  // Brands list
  const availableBrands = useMemo(() => {
    const taxBrands = Object.keys(taxonomy.brands);
    const defaultBrands = Object.keys(INDIAN_CAR_BRANDS);
    const combined = Array.from(new Set([...taxBrands, ...defaultBrands]));
    if (carBrand && !combined.includes(carBrand)) combined.unshift(carBrand);
    return combined;
  }, [taxonomy.brands, carBrand]);

  // Models list
  const availableModels = useMemo(() => {
    if (!carBrand) return [];
    if (taxonomy.brands[carBrand] && taxonomy.brands[carBrand].length > 0) {
      return taxonomy.brands[carBrand];
    }
    // Fallback known models
    const fallbackMap: Record<string, string[]> = {
      "Maruti Suzuki": ["Swift", "Baleno", "Brezza", "Dzire", "Ertiga", "Wagon R", "Alto", "Grand Vitara", "Fronx", "Jimny"],
      "Hyundai": ["Creta", "i20", "Venue", "Verna", "Grand i10", "Aura", "Tucson", "Exter", "Alcazar"],
      "Tata": ["Nexon", "Punch", "Harrier", "Safari", "Altroz", "Tiago", "Tigor", "Curvv"],
      "Mahindra": ["Thar", "Scorpio-N", "XUV700", "Bolero", "XUV300", "Scorpio Classic", "XUV 3XO"],
      "Toyota": ["Innova Crysta", "Fortuner", "Urban Cruiser", "Glanza", "Hyryder", "Hilux", "Camry"],
      "Honda": ["City", "Amaze", "Elevate", "Civic", "WR-V", "Jazz"],
      "Kia": ["Seltos", "Sonet", "Carens", "Carnival", "EV6"],
      "Volkswagen": ["Polo", "Vento", "Taigun", "Virtus", "Tiguan"],
    };
    return fallbackMap[carBrand] || ["Universal / Fits All Models", "Base Model", "Top Model"];
  }, [carBrand, taxonomy.brands]);

  // Variants list
  const availableVariants = useMemo(() => {
    if (!carBrand) return [];
    if (taxonomy.variants[carBrand] && taxonomy.variants[carBrand].length > 0) {
      return taxonomy.variants[carBrand];
    }
    const defaultVariants = (DEFAULT_MODEL_VARIANTS as any)[carBrand] || [
      "All Variants (Fits All)",
      "Base Model",
      "VXi / Mid Variant",
      "ZXi / Top Variant",
    ];
    return defaultVariants;
  }, [carBrand, taxonomy.variants]);

  // Handle Photo Add
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (uploadedImages.length + files.length > 6) {
      setError("Maximum 6 photos allowed.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressedBase64 = await compressImageFile(file, 900, 900, 0.82, 350 * 1024);
        try {
          const cloudUrl = await uploadProductImage(compressedBase64);
          newUrls.push(cloudUrl || compressedBase64);
        } catch {
          newUrls.push(compressedBase64);
        }
      }
      setUploadedImages((prev) => [...prev, ...newUrls].slice(0, 6));
    } catch (err: any) {
      setError(err?.message || "Failed to upload photo.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = (idx: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== idx));
  };

  // Submit Listing Update
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Please enter a title for your spare part.");
      return;
    }
    const cleanPrice = String(price).replace(/[^0-9.]/g, "");
    const numPrice = parseFloat(cleanPrice);
    if (!cleanPrice || isNaN(numPrice) || numPrice <= 0) {
      setError("Please enter a valid selling price in ₹.");
      return;
    }
    if (uploadedImages.length === 0) {
      setError("Please upload at least 1 photo for your listing.");
      return;
    }

    setIsSaving(true);
    try {
      const primaryCover = uploadedImages[0] || "";
      const updates: Partial<SparePart> = {
        title: title.trim(),
        description: description.trim(),
        price: numPrice,
        category: category.trim(),
        condition: condition as any,
        carBrand: carBrand.trim(),
        carModel: carModel.trim(),
        carVariant: carVariant.trim() || undefined,
        imageUrl: primaryCover,
        imageUrls: uploadedImages,
        images: uploadedImages,
        updatedAt: Date.now(),
        ...({
          carYear: carYear.trim() || undefined,
          year: carYear.trim() || undefined,
          fuelType: fuelType.trim() || undefined,
        } as any),
      };

      await onSave(part.id, updates);
      onClose();
    } catch (err: any) {
      console.error("[EditListingModal] Save error:", err);
      setError(err?.message || "Failed to save listing changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Listing
  const confirmPermanentDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      if (onDelete) {
        await onDelete(part.id);
      } else {
        await deleteSparePartListing(part.id);
      }
      setShowDeleteConfirm(false);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to delete listing.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#F8FAFC] min-h-screen sm:min-h-0 sm:rounded-2xl sm:shadow-2xl overflow-hidden flex flex-col my-auto border border-slate-200">
        {/* TOP BAR */}
        <div className="bg-[#0B132B] px-4 py-3.5 flex items-center justify-between text-white sticky top-0 z-30 shadow-sm">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 -ml-1 text-white/90 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <h2 className="text-base font-bold tracking-tight text-white">Edit Listing</h2>

          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="p-1.5 -mr-1 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10 transition-colors"
            title="Delete Listing"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {/* ERROR BANNER */}
        {error && (
          <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* SCROLLABLE FORM BODY */}
        <div className="flex-1 p-3.5 sm:p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-130px)] sm:max-h-[78vh]">
          {/* CARD 1: PHOTOS (Up to 6) */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-[#0066FF]" />
                <span className="text-sm font-bold text-slate-900">
                  Photos ({uploadedImages.length}/6)
                </span>
              </div>
              <span className="text-xs text-slate-500 font-medium">Add up to 6 photos</span>
            </div>

            <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar">
              {uploadedImages.map((imgUri, idx) => (
                <div
                  key={idx}
                  className="relative w-22 h-22 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 group shadow-xs"
                >
                  <img
                    src={imgUri}
                    alt={`Photo ${idx + 1}`}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {idx === 0 && (
                    <span className="absolute bottom-1.5 left-1.5 bg-[#0066FF] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                      Cover
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {uploadedImages.length < 6 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-22 h-22 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-50 flex flex-col items-center justify-center gap-1 shrink-0 text-[#0066FF] transition-all cursor-pointer"
                >
                  {isUploading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Camera className="w-5 h-5 text-[#0066FF]" />
                      <span className="text-[11px] font-bold">Add Photo</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* CARD 2: TITLE & PRICE */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3.5">
            {/* Title Field */}
            <div>
              <div className="flex items-center gap-2 mb-1.5 text-xs font-bold text-slate-900">
                <Pencil className="w-4 h-4 text-[#0066FF]" />
                <span>Title</span>
              </div>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Maruti Suzuki Swift Headlight Assembly"
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] transition-all pr-8"
                />
                {title.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setTitle("")}
                    className="absolute right-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Price Field */}
            <div>
              <div className="flex items-center gap-2 mb-1.5 text-xs font-bold text-slate-900">
                <span className="w-4 h-4 rounded-full bg-blue-100 text-[#0066FF] text-[10px] font-black flex items-center justify-center">
                  ₹
                </span>
                <span>Price ( ₹ )</span>
              </div>
              <div className="relative flex items-center">
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 3500"
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] transition-all pr-8"
                />
                {price.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPrice("")}
                    className="absolute right-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Toggles Row */}
          </div>

          {/* CARD 3: SPECIFICATIONS & FITMENT (Matching Demo Image rows) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden divide-y divide-slate-100">
            {/* Category Row */}
            <button
              type="button"
              onClick={() => setActiveSheet("category")}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                  <Settings className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-900">Category</span>
              </div>
              <div className="flex items-center gap-1 text-slate-600 shrink-0">
                <span className="text-sm text-slate-600 font-medium">{category}</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </button>

            {/* Condition Row */}
            <button
              type="button"
              onClick={() => setActiveSheet("condition")}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-900">Condition</span>
              </div>
              <div className="flex items-center gap-1 text-slate-600 shrink-0">
                <span className="text-sm text-slate-600 font-medium">{condition}</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </button>

            {/* Car Brand / Make Row */}
            <button
              type="button"
              onClick={() => {
                setSheetSearchQuery("");
                setActiveSheet("brand");
              }}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#0066FF] flex items-center justify-center shrink-0">
                  <Car className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-900">Car Brand / Make</span>
              </div>
              <div className="flex items-center gap-1 text-slate-600 shrink-0">
                <span className="text-sm text-slate-600 font-medium">{carBrand}</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </button>

            {/* Model Row */}
            <button
              type="button"
              onClick={() => {
                setSheetSearchQuery("");
                setActiveSheet("model");
              }}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#0066FF] flex items-center justify-center shrink-0">
                  <Car className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-900">Model</span>
              </div>
              <div className="flex items-center gap-1 text-slate-600 shrink-0">
                <span className="text-sm text-slate-600 font-medium">{carModel || "Select Model"}</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </button>

            {/* Variant (Optional) Row */}
            <button
              type="button"
              onClick={() => setActiveSheet("variant")}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#0066FF] flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-900">Variant (Optional)</span>
              </div>
              <div className="flex items-center gap-1 text-slate-600 shrink-0">
                <span className="text-sm text-slate-600 font-medium">{carVariant || "Optional"}</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </button>

            {/* Manufacturing Year Row */}
            <button
              type="button"
              onClick={() => setActiveSheet("year")}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#0066FF] flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-900">Manufacturing Year</span>
              </div>
              <div className="flex items-center gap-1 text-slate-600 shrink-0">
                <span className="text-sm text-slate-600 font-medium">{carYear}</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </button>

            {/* Fuel Type Row */}
            <button
              type="button"
              onClick={() => setActiveSheet("fuel")}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#0066FF] flex items-center justify-center shrink-0">
                  <Fuel className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-900">Fuel Type</span>
              </div>
              <div className="flex items-center gap-1 text-slate-600 shrink-0">
                <span className="text-sm text-slate-600 font-medium">{fuelType}</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </button>
          </div>

          {/* CARD 4: DESCRIPTION */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setTempDescInput(description);
                setActiveSheet("description");
              }}
              className="w-full flex items-center justify-between text-left mb-2"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#0066FF]" />
                <span className="text-sm font-bold text-slate-900">Description</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
            <p
              onClick={() => {
                setTempDescInput(description);
                setActiveSheet("description");
              }}
              className={`text-xs leading-relaxed line-clamp-3 cursor-pointer ${
                description ? "text-slate-600" : "text-slate-400 italic"
              }`}
            >
              {description || "Tap to add details about condition, fitment, or vehicle model..."}
            </p>
          </div>

          {/* CARD 5: LOCATION & CONTACT (Locked) */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0066FF] flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Location & Contact</div>
                  <div className="text-sm font-semibold text-slate-800 mt-0.5">{lockedLocation}</div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <Lock className="w-3 h-3 text-slate-400" />
                    <span>Cannot be changed</span>
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
          </div>
        </div>

        {/* BOTTOM SAVE BUTTON */}
        <div className="p-3.5 sm:p-4 bg-white border-t border-slate-200 sticky bottom-0 z-20">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="w-full py-3.5 px-4 bg-[#0066FF] hover:bg-blue-600 active:bg-blue-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>

        {/* ========================================================= */}
        {/* 1. SELECT CATEGORY BOTTOM SHEET (Exact replica of Image)  */}
        {/* ========================================================= */}
        {activeSheet === "category" && (
          <div className="fixed inset-0 z-60 flex items-end justify-center bg-slate-950/60 backdrop-blur-2xs animate-in fade-in duration-200">
            <div
              className="fixed inset-0"
              onClick={() => setActiveSheet(null)}
            />
            <div className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl p-5 pb-7 z-10 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-250">
              {/* Top drag handle */}
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />

              <h3 className="text-lg font-bold text-slate-900 mb-3">Select Category</h3>

              <div className="overflow-y-auto divide-y divide-slate-100 flex-1 pr-1">
                {REAL_CATEGORIES.map((catName) => {
                  const isSelected = category === catName;
                  return (
                    <button
                      key={catName}
                      type="button"
                      onClick={() => {
                        setCategory(catName);
                        setActiveSheet(null);
                      }}
                      className={`w-full py-3.5 px-2 flex items-center justify-between text-left hover:bg-slate-50 transition-colors rounded-xl ${
                        isSelected ? "bg-blue-50/60" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <Category3DIcon type={catName} size={44} />
                        <span
                          className={`text-base font-bold ${
                            isSelected ? "text-[#0066FF]" : "text-slate-900"
                          }`}
                        >
                          {catName}
                        </span>
                      </div>
                      {isSelected ? (
                        <Check className="w-5 h-5 text-[#0066FF]" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setActiveSheet(null)}
                className="mt-4 w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. SELECT BRAND BOTTOM SHEET                             */}
        {/* ========================================================= */}
        {activeSheet === "brand" && (
          <div className="fixed inset-0 z-60 flex items-end justify-center bg-slate-950/60 backdrop-blur-2xs animate-in fade-in duration-200">
            <div className="fixed inset-0" onClick={() => setActiveSheet(null)} />
            <div className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl p-5 pb-7 z-10 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-250">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-3">Select Car Brand / Make</h3>

              {/* Search Box */}
              <div className="relative mb-3">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search brand (e.g. Maruti, Hyundai, Tata)..."
                  value={sheetSearchQuery}
                  onChange={(e) => setSheetSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-100 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0066FF]"
                />
              </div>

              <div className="overflow-y-auto divide-y divide-slate-100 flex-1 pr-1">
                {availableBrands
                  .filter((b) => b.toLowerCase().includes(sheetSearchQuery.toLowerCase()))
                  .map((b) => {
                    const isSelected = carBrand.toLowerCase() === b.toLowerCase();
                    return (
                      <button
                        key={b}
                        type="button"
                        onClick={() => {
                          setCarBrand(b);
                          if (carBrand.toLowerCase() !== b.toLowerCase()) {
                            const newModels = taxonomy.brands[b] || [];
                            setCarModel(newModels[0] || "");
                            setCarVariant("");
                          }
                          setActiveSheet(null);
                        }}
                        className={`w-full py-3 px-2 flex items-center justify-between text-left hover:bg-slate-50 transition-colors rounded-xl ${
                          isSelected ? "bg-blue-50/60" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <BrandLogo brand={b} size={32} />
                          <span
                            className={`text-sm font-semibold ${
                              isSelected ? "text-[#0066FF] font-bold" : "text-slate-900"
                            }`}
                          >
                            {b}
                          </span>
                        </div>
                        {isSelected ? (
                          <Check className="w-5 h-5 text-[#0066FF]" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        )}
                      </button>
                    );
                  })}
              </div>

              <button
                type="button"
                onClick={() => setActiveSheet(null)}
                className="mt-4 w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. SELECT MODEL BOTTOM SHEET                             */}
        {/* ========================================================= */}
        {activeSheet === "model" && (
          <div className="fixed inset-0 z-60 flex items-end justify-center bg-slate-950/60 backdrop-blur-2xs animate-in fade-in duration-200">
            <div className="fixed inset-0" onClick={() => setActiveSheet(null)} />
            <div className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl p-5 pb-7 z-10 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-250">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-3">Select Model ({carBrand})</h3>

              <div className="relative mb-3">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search model (e.g. Swift, Creta, Nexon)..."
                  value={sheetSearchQuery}
                  onChange={(e) => setSheetSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-100 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0066FF]"
                />
              </div>

              <div className="overflow-y-auto divide-y divide-slate-100 flex-1 pr-1">
                {availableModels
                  .filter((m) => m.toLowerCase().includes(sheetSearchQuery.toLowerCase()))
                  .map((m) => {
                    const isSelected = carModel.toLowerCase() === m.toLowerCase();
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setCarModel(m);
                          setCarVariant("");
                          setActiveSheet(null);
                        }}
                        className={`w-full py-3 px-2 flex items-center justify-between text-left hover:bg-slate-50 transition-colors rounded-xl ${
                          isSelected ? "bg-blue-50/60" : ""
                        }`}
                      >
                        <span
                          className={`text-sm font-semibold ${
                            isSelected ? "text-[#0066FF] font-bold" : "text-slate-900"
                          }`}
                        >
                          {m}
                        </span>
                        {isSelected ? (
                          <Check className="w-5 h-5 text-[#0066FF]" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        )}
                      </button>
                    );
                  })}
              </div>

              <button
                type="button"
                onClick={() => setActiveSheet(null)}
                className="mt-4 w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 4. SELECT VARIANT BOTTOM SHEET                           */}
        {/* ========================================================= */}
        {activeSheet === "variant" && (
          <div className="fixed inset-0 z-60 flex items-end justify-center bg-slate-950/60 backdrop-blur-2xs animate-in fade-in duration-200">
            <div className="fixed inset-0" onClick={() => setActiveSheet(null)} />
            <div className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl p-5 pb-7 z-10 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-250">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-3">Select Variant</h3>

              <div className="overflow-y-auto divide-y divide-slate-100 flex-1 pr-1">
                {availableVariants.map((v) => {
                  const isSelected = carVariant.toLowerCase() === v.toLowerCase();
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        setCarVariant(v);
                        setActiveSheet(null);
                      }}
                      className={`w-full py-3 px-2 flex items-center justify-between text-left hover:bg-slate-50 transition-colors rounded-xl ${
                        isSelected ? "bg-blue-50/60" : ""
                      }`}
                    >
                      <span
                        className={`text-sm font-semibold ${
                          isSelected ? "text-[#0066FF] font-bold" : "text-slate-900"
                        }`}
                      >
                        {v}
                      </span>
                      {isSelected ? (
                        <Check className="w-5 h-5 text-[#0066FF]" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setActiveSheet(null)}
                className="mt-4 w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 5. SELECT CONDITION BOTTOM SHEET                         */}
        {/* ========================================================= */}
        {activeSheet === "condition" && (
          <div className="fixed inset-0 z-60 flex items-end justify-center bg-slate-950/60 backdrop-blur-2xs animate-in fade-in duration-200">
            <div className="fixed inset-0" onClick={() => setActiveSheet(null)} />
            <div className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl p-5 pb-7 z-10 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-250">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-3">Select Condition</h3>

              <div className="divide-y divide-slate-100 flex-1 pr-1">
                {CONDITION_OPTIONS.map((c) => {
                  const isSelected = condition.toLowerCase() === c.label.toLowerCase();
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setCondition(c.label as any);
                        setActiveSheet(null);
                      }}
                      className={`w-full py-3 px-2 flex items-center justify-between text-left hover:bg-slate-50 transition-colors rounded-xl ${
                        isSelected ? "bg-blue-50/60" : ""
                      }`}
                    >
                      <div>
                        <div
                          className={`text-sm font-semibold ${
                            isSelected ? "text-[#0066FF] font-bold" : "text-slate-900"
                          }`}
                        >
                          {c.label}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{c.desc}</div>
                      </div>
                      {isSelected ? (
                        <Check className="w-5 h-5 text-[#0066FF]" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setActiveSheet(null)}
                className="mt-4 w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 6. SELECT YEAR BOTTOM SHEET                              */}
        {/* ========================================================= */}
        {activeSheet === "year" && (
          <div className="fixed inset-0 z-60 flex items-end justify-center bg-slate-950/60 backdrop-blur-2xs animate-in fade-in duration-200">
            <div className="fixed inset-0" onClick={() => setActiveSheet(null)} />
            <div className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl p-5 pb-7 z-10 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-250">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-3">Manufacturing Year</h3>

              <div className="overflow-y-auto divide-y divide-slate-100 flex-1 pr-1">
                {YEARS.map((yr) => {
                  const isSelected = carYear === yr;
                  return (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => {
                        setCarYear(yr);
                        setActiveSheet(null);
                      }}
                      className={`w-full py-3 px-2 flex items-center justify-between text-left hover:bg-slate-50 transition-colors rounded-xl ${
                        isSelected ? "bg-blue-50/60" : ""
                      }`}
                    >
                      <span
                        className={`text-sm font-semibold ${
                          isSelected ? "text-[#0066FF] font-bold" : "text-slate-900"
                        }`}
                      >
                        {yr}
                      </span>
                      {isSelected ? (
                        <Check className="w-5 h-5 text-[#0066FF]" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setActiveSheet(null)}
                className="mt-4 w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 7. SELECT FUEL TYPE BOTTOM SHEET                         */}
        {/* ========================================================= */}
        {activeSheet === "fuel" && (
          <div className="fixed inset-0 z-60 flex items-end justify-center bg-slate-950/60 backdrop-blur-2xs animate-in fade-in duration-200">
            <div className="fixed inset-0" onClick={() => setActiveSheet(null)} />
            <div className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl p-5 pb-7 z-10 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-250">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-3">Select Fuel Type</h3>

              <div className="divide-y divide-slate-100 flex-1 pr-1">
                {FUEL_TYPES.map((f) => {
                  const isSelected = fuelType === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => {
                        setFuelType(f);
                        setActiveSheet(null);
                      }}
                      className={`w-full py-3 px-2 flex items-center justify-between text-left hover:bg-slate-50 transition-colors rounded-xl ${
                        isSelected ? "bg-blue-50/60" : ""
                      }`}
                    >
                      <span
                        className={`text-sm font-semibold ${
                          isSelected ? "text-[#0066FF] font-bold" : "text-slate-900"
                        }`}
                      >
                        {f}
                      </span>
                      {isSelected ? (
                        <Check className="w-5 h-5 text-[#0066FF]" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setActiveSheet(null)}
                className="mt-4 w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 8. DESCRIPTION EDIT MODAL                                */}
        {/* ========================================================= */}
        {activeSheet === "description" && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/60 backdrop-blur-2xs p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl">
              <h4 className="text-base font-bold text-slate-900 mb-1">Description</h4>
              <p className="text-xs text-slate-500 mb-3">
                Detail working condition, cosmetic state, and car fitment.
              </p>
              <textarea
                rows={6}
                placeholder="Provide complete description for buyers..."
                value={tempDescInput}
                onChange={(e) => setTempDescInput(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 mb-4 focus:outline-none focus:ring-1 focus:ring-[#0066FF]"
              />
              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveSheet(null)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDescription(tempDescInput.trim());
                    setActiveSheet(null);
                  }}
                  className="px-5 py-2 text-sm font-bold text-white bg-[#0066FF] hover:bg-blue-600 rounded-lg shadow transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* DELETE CONFIRMATION MODAL                                */}
        {/* ========================================================= */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-1">Delete this listing?</h4>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                Are you sure you want to permanently delete this listing? This action cannot be undone.
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmPermanentDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow transition-colors text-sm flex items-center justify-center gap-1.5"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
