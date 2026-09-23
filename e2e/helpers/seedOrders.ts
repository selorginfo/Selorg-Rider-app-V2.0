import { ObjectId } from "mongodb";
import { withMongoDb } from "./auth";

const HUB_KEY = "DS-Adyar-01";
const SEED_TAG = "rider-automation-seed";

/**
 * Ensure the test rider can see at least one offered order in assignorders.
 * Writes only into real Mongo collections used by production (no mocks).
 * Idempotent: reuses the tagged seed order when present.
 */
export async function ensureOfferedOrderForRider(userId: string): Promise<{
  orderId: string;
  orderNumber: string;
}> {
  return withMongoDb(async (db) => {
    const users = db.collection("picker_users");
    const orders = db.collection("customer_orders");

    await users.updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          currentLocationId: HUB_KEY,
          deliveryMode: "standard",
          status: "ACTIVE",
          updatedAt: new Date(),
        },
      },
    );

    const existing = await orders.findOne({
      orderNumber: { $regex: `^${SEED_TAG}` },
      riderStage: "offered",
      pickerId: null,
    });
    if (existing) {
      await orders.updateOne(
        { _id: existing._id },
        {
          $set: {
            offerHubKey: HUB_KEY,
            status: "confirmed",
            deliveryType: "standard",
            offerExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
            updatedAt: new Date(),
          },
        },
      );
      return {
        orderId: String(existing._id),
        orderNumber: String(existing.orderNumber),
      };
    }

    const orderNumber = `${SEED_TAG}-${Date.now()}`;
    const insert = await orders.insertOne({
      userId: new ObjectId(),
      orderNumber,
      items: [
        {
          productId: new ObjectId(),
          name: "Automation Seed Item",
          quantity: 1,
          price: 49,
          unitPrice: 49,
        },
      ],
      status: "confirmed",
      timeline: [],
      cancellationReason: "",
      deliveryAddress: {
        line1: "12 Lattice Bridge Rd",
        line2: "",
        city: "Chennai",
        state: "TN",
        pincode: "600020",
        landmark: "Near Adyar",
        latitude: 13.0067,
        longitude: 80.2571,
      },
      deliveryNotes: "",
      paymentMethod: {
        methodType: "cash",
        displayLabel: "COD",
      },
      paymentStatus: "cod_pending",
      itemTotal: 49,
      totalTax: 0,
      handlingCharge: 0,
      deliveryFee: 20,
      deliveryTip: 0,
      discount: 0,
      walletDeduction: 0,
      onlineAmountDue: 0,
      totalBill: 69,
      pricingSnapshot: null,
      otpVerified: false,
      otpAttempts: 0,
      refundStatus: "none",
      refundAmount: 0,
      riderId: null,
      pickerId: null,
      riderStage: "offered",
      offerHubKey: HUB_KEY,
      offerExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      riderPayout: 35,
      riderEarningBreakdown: { base: 30, distance: 5 },
      dispatchBay: "B1",
      bagCode: "BAG-AUTO-1",
      distanceKm: 2.1,
      etaMinutes: 12,
      isPriority: false,
      deliveryType: "standard",
      bulkBatchId: null,
      riderReassignmentCount: 0,
      fulfillmentReleased: false,
      cartRestoredAt: null,
      checkoutCouponCode: "",
      ratingComment: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { orderId: String(insert.insertedId), orderNumber };
  });
}
