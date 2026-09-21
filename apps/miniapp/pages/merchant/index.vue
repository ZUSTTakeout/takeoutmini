<script setup
    lang="ts">    import { ref, onShow } from 'vue'; import { api } from '../../lib/api'; const shop = ref<any>({ products: [], categories: [] }), orders = ref<any[]>([]), stats = ref<any>({}); async function load() { try { shop.value = await api.request('/merchant/shop'); orders.value = await api.request('/merchant/orders'); stats.value = await api.request('/merchant/stats') } catch (e: any) { uni.showToast({ title: e.message, icon: 'none' }) } } async function status(o: any, s: string) { try { await api.request(`/orders/${o.id}/status`, 'PATCH', { status: s }); load() } catch (e: any) { uni.showToast({ title: e.message, icon: 'none' }) } } async function toggle() { shop.value = await api.request('/merchant/shop', 'PATCH', { isOpen: !shop.value.isOpen }) } onShow(load)</script>
<template>
    <view class="page">
        <view class="head">
            <view>
                <view class="title">商户工作台</view>
                <view class="sub">{{ shop.name }}</view>
            </view>
            <switch :checked="shop.isOpen" color="#f36d3b" @change="toggle" />
        </view>
        <view class="stats">
            <view><text>{{ stats.completedOrders || 0 }}</text><label>已完成订单</label></view>
            <view><text>{{ api.money(stats.revenue || 0) }}</text><label>累计营业额</label></view>
            <view><text>{{ shop.products?.length || 0 }}</text><label>在售商品</label></view>
        </view>
        <view class="section-title">待处理订单</view>
        <view v-if="!orders.filter(o => ['CREATED', 'ACCEPTED', 'READY'].includes(o.status)).length" class="empty">暂无待处理订单
        </view>
        <view v-for="o in orders.filter(o => ['CREATED', 'ACCEPTED', 'READY'].includes(o.status))" :key="o.id"
            class="order">
            <view class="order-top"><text>#{{ o.number.slice(-6) }}</text><text>{{ api.money(o.total) }}</text></view>
            <view class="items">{{o.items.map((x: any) => x.name + ' × ' + x.quantity).join('、')}}</view><button
                v-if="o.status === 'CREATED'" @click="status(o, 'ACCEPTED')">接单并开始制作</button><button
                v-else-if="o.status === 'ACCEPTED'" @click="status(o, 'READY')">出餐，通知取餐</button><button v-else
                @click="status(o, 'COMPLETED')">确认已取餐</button>
        </view>
    </view>
</template>
<style
    scoped>
    .page {
        padding: 46rpx 32rpx
    }

    .head {
        display: flex;
        justify-content: space-between;
        align-items: center
    }

    .title {
        font-size: 46rpx;
        font-weight: 800
    }

    .sub {
        color: #999;
        margin-top: 10rpx
    }

    .stats {
        display: flex;
        background: #2d2824;
        color: white;
        border-radius: 26rpx;
        padding: 30rpx 12rpx;
        margin: 35rpx 0;
        justify-content: space-around;
        text-align: center
    }

    .stats view {
        flex: 1
    }

    .stats text {
        display: block;
        color: #ffb08d;
        font-size: 34rpx;
        font-weight: 700
    }

    .stats label {
        display: block;
        color: #c9c0ba;
        font-size: 21rpx;
        margin-top: 10rpx
    }

    .section-title {
        font-size: 34rpx;
        font-weight: 700;
        margin: 28rpx 0
    }

    .order {
        background: #fff;
        border-radius: 24rpx;
        padding: 26rpx;
        margin-bottom: 18rpx
    }

    .order-top {
        display: flex;
        justify-content: space-between;
        font-weight: 700
    }

    .order-top text:last-child {
        color: #ed5c2c
    }

    .items {
        color: #777;
        font-size: 24rpx;
        margin: 18rpx 0
    }

    .order button {
        background: #f36d3b;
        color: #fff;
        font-size: 25rpx
    }

    .empty {
        text-align: center;
        color: #aaa;
        padding: 80rpx 0
    }
</style>
