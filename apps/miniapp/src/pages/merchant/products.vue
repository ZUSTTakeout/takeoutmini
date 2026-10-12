<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import StateView from "../../components/StateView.vue";
import { api, getErrorMessage } from "../../services/api";
import type { Category, Product, Shop } from "../../types";

interface ProductDraft {
  name: string;
  priceYuan: string;
  stock: string;
  categoryId: string;
  description: string;
  image: string;
  isAvailable: boolean;
}

const shop = ref<Shop | null>(null);
const categories = ref<Category[]>([]);
const loading = ref(false);
const saving = ref(false);
const error = ref("");
const formOpen = ref(false);
const editingId = ref("");
const draft = reactive<ProductDraft>({
  name: "",
  priceYuan: "",
  stock: "0",
  categoryId: "",
  description: "",
  image: "",
  isAvailable: true,
});

const products = computed(() => shop.value?.products ?? []);
const categoryNames = computed(() =>
  new Map(categories.value.map((category) => [category.id, category.name])),
);

async function load() {
  if (!api.isRole("MERCHANT")) {
    error.value = "请使用商户账号登录后管理商品";
    return;
  }
  loading.value = true;
  error.value = "";
  try {
    const [shopResult, categoryResult] = await Promise.all([
      api.merchantShop(),
      api.categories(),
    ]);
    shop.value = shopResult;
    categories.value = categoryResult;
  } catch (reason: unknown) {
    error.value = getErrorMessage(reason, "商品信息加载失败");
  } finally {
    loading.value = false;
  }
}

function resetDraft() {
  editingId.value = "";
  Object.assign(draft, {
    name: "",
    priceYuan: "",
    stock: "0",
    categoryId: categories.value[0]?.id ?? "",
    description: "",
    image: "",
    isAvailable: true,
  });
}

function addProduct() {
  resetDraft();
  formOpen.value = true;
}

function editProduct(product: Product) {
  editingId.value = product.id;
  Object.assign(draft, {
    name: product.name,
    priceYuan: (product.price / 100).toFixed(2),
    stock: String(product.stock),
    categoryId: product.categoryId,
    description: product.description ?? "",
    image: product.image ?? "",
    isAvailable: product.isAvailable,
  });
  formOpen.value = true;
}

function chooseCategory(event: Event) {
  const index = Number(
    (event as unknown as { detail?: { value?: string } }).detail?.value,
  );
  const category = categories.value[index];
  if (category) draft.categoryId = category.id;
}

function setAvailable(event: Event) {
  draft.isAvailable = Boolean(
    (event as unknown as { detail?: { value?: boolean } }).detail?.value,
  );
}

async function saveProduct() {
  if (saving.value) return;
  const name = draft.name.trim();
  const price = Number(draft.priceYuan);
  const stock = Number(draft.stock);
  if (!name || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) {
    uni.showToast({ title: "请检查商品名称、价格和库存", icon: "none" });
    return;
  }
  if (!draft.categoryId) {
    uni.showToast({ title: "请先创建并选择商品分类", icon: "none" });
    return;
  }

  saving.value = true;
  try {
    const updated = await api.product(
      {
        name,
        price: Math.round(price * 100),
        stock,
        categoryId: draft.categoryId,
        description: draft.description.trim(),
        image: draft.image.trim() || null,
        isAvailable: draft.isAvailable,
      },
      editingId.value || undefined,
    );
    if (!shop.value) return;
    const index = shop.value.products.findIndex((product) => product.id === updated.id);
    if (index < 0) shop.value.products.unshift(updated);
    else shop.value.products.splice(index, 1, updated);
    formOpen.value = false;
    uni.showToast({ title: editingId.value ? "商品已更新" : "商品已新增" });
  } catch (reason: unknown) {
    uni.showToast({ title: getErrorMessage(reason, "保存商品失败"), icon: "none" });
  } finally {
    saving.value = false;
  }
}

async function changeStock(product: Product, delta: number) {
  const nextStock = product.stock + delta;
  if (nextStock < 0 || nextStock > 1_000_000) return;
  try {
    const updated = await api.product({ stock: nextStock }, product.id);
    const index = shop.value?.products.findIndex((item) => item.id === product.id) ?? -1;
    if (index >= 0 && shop.value) shop.value.products.splice(index, 1, updated);
  } catch (reason: unknown) {
    uni.showToast({ title: getErrorMessage(reason, "库存更新失败"), icon: "none" });
  }
}

async function toggleAvailable(product: Product, event: Event) {
  const isAvailable = Boolean(
    (event as unknown as { detail?: { value?: boolean } }).detail?.value,
  );
  try {
    const updated = await api.product({ isAvailable }, product.id);
    const index = shop.value?.products.findIndex((item) => item.id === product.id) ?? -1;
    if (index >= 0 && shop.value) shop.value.products.splice(index, 1, updated);
  } catch (reason: unknown) {
    uni.showToast({ title: getErrorMessage(reason, "商品状态更新失败"), icon: "none" });
  }
}

function addCategory() {
  uni.showModal({
    title: "新增分类",
    editable: true,
    placeholderText: "例如：主食",
    success: async ({ confirm, content }) => {
      if (!confirm || !content?.trim()) return;
      try {
        const category = await api.addCategory(content.trim());
        categories.value = [...categories.value, category].sort((a, b) =>
          a.name.localeCompare(b.name, "zh-CN"),
        );
        if (!draft.categoryId) draft.categoryId = category.id;
        uni.showToast({ title: "分类已添加" });
      } catch (reason: unknown) {
        uni.showToast({ title: getErrorMessage(reason, "新增分类失败"), icon: "none" });
      }
    },
  });
}

onShow(load);
</script>

<template>
  <view class="page">
    <view class="toolbar">
      <text class="intro">{{ shop?.name || "店铺" }} · {{ products.length }} 件商品</text>
      <button class="primary small-button" @click="addProduct">新增商品</button>
    </view>

    <StateView :loading="loading" />
    <StateView
      v-if="!loading && error"
      :error="error"
      action-text="重新加载"
      @action="load"
    />

    <template v-if="!loading && !error">
      <view class="category-panel">
        <view class="section-head">
          <text class="section-title">商品分类</text>
          <text class="text-action" @click="addCategory">＋ 新增分类</text>
        </view>
        <view v-if="categories.length" class="chips">
          <text v-for="category in categories" :key="category.id" class="chip">
            {{ category.name }}
          </text>
        </view>
        <text v-else class="muted">还没有分类，请先新增分类</text>
      </view>

      <StateView :empty="products.length === 0" empty-text="还没有商品" />
      <view v-for="product in products" :key="product.id" class="product-card">
        <view class="product-top">
          <view class="product-main">
            <view class="product-name">{{ product.name }}</view>
            <view class="product-meta">
              {{ categoryNames.get(product.categoryId) || "未分类" }} · {{ api.money(product.price) }}
            </view>
          </view>
          <switch
            :checked="product.isAvailable"
            color="#c4532b"
            @change="toggleAvailable(product, $event)"
          />
        </view>
        <view class="product-bottom">
          <view class="stock-control">
            <text class="muted">库存</text>
            <button class="step" :disabled="product.stock <= 0" @click="changeStock(product, -1)">−</button>
            <text class="stock-value">{{ product.stock }}</text>
            <button class="step" @click="changeStock(product, 1)">＋</button>
          </view>
          <text class="text-action" @click="editProduct(product)">编辑</text>
        </view>
        <text :class="['availability', { off: !product.isAvailable }]">
          {{ product.isAvailable ? "销售中" : "已下架" }}
        </text>
      </view>
    </template>

    <view v-if="formOpen" class="form-mask">
      <view class="form-sheet">
        <view class="section-head">
          <text class="section-title">{{ editingId ? "编辑商品" : "新增商品" }}</text>
          <text class="text-action" @click="formOpen = false">关闭</text>
        </view>
        <scroll-view scroll-y class="form-scroll">
          <input v-model="draft.name" class="field" maxlength="60" placeholder="商品名称" />
          <view class="field-row">
            <input v-model="draft.priceYuan" class="field half" type="digit" placeholder="价格（元）" />
            <input v-model="draft.stock" class="field half" type="number" placeholder="库存" />
          </view>
          <picker
            mode="selector"
            :range="categories"
            range-key="name"
            :value="Math.max(0, categories.findIndex((item) => item.id === draft.categoryId))"
            @change="chooseCategory"
          >
            <view class="field picker-field">
              {{ categoryNames.get(draft.categoryId) || "选择分类" }}
            </view>
          </picker>
          <textarea v-model="draft.description" class="field textarea" maxlength="500" placeholder="商品描述（选填）" />
          <input v-model="draft.image" class="field" maxlength="2048" placeholder="图片 URL（选填，需 http/https）" />
          <view class="availability-row">
            <text>保存后上架</text>
            <switch :checked="draft.isAvailable" color="#c4532b" @change="setAvailable" />
          </view>
          <button class="primary save-button" :disabled="saving" @click="saveProduct">
            {{ saving ? "保存中…" : "保存商品" }}
          </button>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { padding: 28rpx 30rpx calc(40rpx + env(safe-area-inset-bottom)); }
.toolbar, .section-head, .product-top, .product-bottom, .stock-control, .availability-row { display: flex; align-items: center; justify-content: space-between; }
.toolbar { margin-bottom: 22rpx; gap: 16rpx; }
.intro, .muted { color: #81766e; font-size: 22rpx; }
.small-button { margin: 0; }
.primary { background: #c4532b; color: #fff; }
.category-panel, .product-card { margin-bottom: 18rpx; padding: 24rpx; border: 1rpx solid #eee3da; border-radius: 22rpx; background: #fff; }
.section-title { font-size: 27rpx; font-weight: 700; }
.text-action { color: #a43e1d; font-size: 23rpx; font-weight: 700; }
.chips { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 18rpx; }
.chip { padding: 8rpx 16rpx; border-radius: 999rpx; background: #fff0e5; color: #a43e1d; font-size: 21rpx; }
.product-name { font-size: 28rpx; font-weight: 700; }
.product-meta { margin-top: 8rpx; color: #a43e1d; font-size: 22rpx; }
.product-bottom { margin-top: 18rpx; }
.stock-control { justify-content: flex-start; gap: 14rpx; }
.step { width: 48rpx; height: 48rpx; margin: 0; padding: 0; background: #fff0e5; color: #a43e1d; font-size: 28rpx; line-height: 48rpx; }
.step[disabled] { color: #c7bcb4; }
.stock-value { min-width: 36rpx; text-align: center; font-size: 23rpx; }
.availability { display: inline-block; margin-top: 14rpx; padding: 5rpx 12rpx; border-radius: 999rpx; background: #e7f4e9; color: #28794a; font-size: 19rpx; }
.availability.off { background: #f1eeeb; color: #81766e; }
.form-mask { position: fixed; inset: 0; z-index: 20; display: flex; align-items: flex-end; background: rgb(45 40 36 / 45%); }
.form-sheet { width: 100%; max-height: 88vh; box-sizing: border-box; padding: 30rpx; border-radius: 28rpx 28rpx 0 0; background: #fffaf4; }
.form-scroll { max-height: calc(88vh - 90rpx); padding-top: 20rpx; box-sizing: border-box; }
.field { box-sizing: border-box; width: 100%; min-height: 82rpx; margin-bottom: 16rpx; padding: 20rpx; border: 1rpx solid #e5d8ce; border-radius: 14rpx; background: #fff; font-size: 24rpx; }
.field-row { display: flex; gap: 14rpx; }
.half { min-width: 0; flex: 1; }
.picker-field { display: flex; align-items: center; }
.textarea { height: 130rpx; }
.availability-row { padding: 4rpx 6rpx 20rpx; color: #655b54; font-size: 23rpx; }
.save-button { margin: 0 0 20rpx; }
</style>
