import { useState, useEffect } from "react";
import toastError from "../../errors/toastError";

import api from "../../services/api";

const usePlans = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetchPlans = async () => {
      try {
        const { data } = await api.get("/plans/list");
        console.log("[usePlans] Plans received:", data);

        if (Array.isArray(data)) {
          setPlans(data);
        } else if (data && Array.isArray(data.plans)) {
          setPlans(data.plans);
        } else {
          console.warn("[usePlans] Invalid plans data format:", data);
          setPlans([]);
        }

        setLoading(false);
      } catch (err) {
        console.error("[usePlans] Error fetching plans:", err);
        setLoading(false);
        setPlans([]);
        toastError(err);
      }
    };
    fetchPlans();
  }, []);

  return { plans, loading };
};

export default usePlans;