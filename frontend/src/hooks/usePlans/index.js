import api, { openApi } from "../../services/api";

const usePlans = () => {

    const getPlanList = async (params) => {
        try {
            const { data } = await openApi.request({
                url: '/plans/list',
                method: 'GET',
                params
            });
            console.log("[usePlans] Plans fetched successfully:", data);
            return data;
        } catch (error) {
            console.error("[usePlans] Error fetching plans:", error);
            throw error;
        }
    }

    const list = async (params) => {
        const { data } = await api.request({
            url: '/plans/all',
            method: 'GET',
            params
        });
        return data;
    }

    const finder = async (id) => {
        const { data } = await api.request({
            url: `/plans/${id}`,
            method: 'GET'
        });
        return data;
    }

    const save = async (data) => {
        const { data: responseData } = await api.request({
            url: '/plans',
            method: 'POST',
            data
        });
        return responseData;
    }

    const update = async (data) => {
        const { data: responseData } = await api.request({
            url: `/plans/${data.id}`,
            method: 'PUT',
            data
        });
        return responseData;
    }

    const remove = async (id) => {
        const { data } = await api.request({
            url: `/plans/${id}`,
            method: 'DELETE'
        });
        return data;
    }

    const getPlanCompany = async (params, id) => {
        const { data } = await api.request({
            url: `/companies/listPlan/${id}`,
            method: 'GET',
            params
        });
        return data;
    }

    return {
        getPlanList,
        list,
        save,
        update,
        finder,
        remove,
        getPlanCompany
    }
}

export default usePlans;