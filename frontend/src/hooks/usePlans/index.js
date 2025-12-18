import { useState, useEffect, useCallback } from "react";
import toastError from "../../errors/toastError";

import api from "../../services/api";

const usePlans = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPlans = useCallback(async () => {
    try {
      const { data } = await api.get("/plans/list");
      console.log("[usePlans] Plans received:", data);

      if (Array.isArray(data)) {
        setPlans(data);
        return data;
      } else if (data && Array.isArray(data.plans)) {
        setPlans(data.plans);
        return data.plans;
      } else {
        console.warn("[usePlans] Invalid plans data format:", data);
        setPlans([]);
        return [];
      }
    } catch (err) {
      console.error("[usePlans] Error fetching plans:", err);
      setPlans([]);
      toastError(err);
      throw err;
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchPlans()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fetchPlans]);

  const list = useCallback(async () => {
    return fetchPlans();
  }, [fetchPlans]);

  const save = useCallback(async (planData) => {
    try {
      const { data } = await api.post("/plans", planData);
      console.log("[usePlans] Plan saved:", data);
      setPlans((prev) => [...prev, data]);
      return data;
    } catch (err) {
      console.error("[usePlans] Error saving plan:", err);
      toastError(err);
      throw err;
    }
  }, []);

  const update = useCallback(async (planData) => {
    try {
      const { data } = await api.put(`/plans/${planData.id}`, planData);
      console.log("[usePlans] Plan updated:", data);
      setPlans((prev) =>
        prev.map((plan) => (plan.id === data.id ? data : plan))
      );
      return data;
    } catch (err) {
      console.error("[usePlans] Error updating plan:", err);
      toastError(err);
      throw err;
    }
  }, []);

  const remove = useCallback(async (planId) => {
    try {
      const { data } = await api.delete(`/plans/${planId}`);
      console.log("[usePlans] Plan removed:", data);
      setPlans((prev) => prev.filter((plan) => plan.id !== planId));
      return data;
    } catch (err) {
      console.error("[usePlans] Error removing plan:", err);
      toastError(err);
      throw err;
    }
  }, []);

  const getPlanCompany = useCallback(async (planId, companyId) => {
    try {
      const { data } = await api.get(`/companies/listPlan/${companyId}`);
      return data;
    } catch (err) {
      console.error("[usePlans] Error getting plan company:", err);
      throw err;
    }
  }, []);

  return { plans, loading, list, save, update, remove, getPlanCompany };
};

export default usePlans;