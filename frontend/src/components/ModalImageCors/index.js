import React, { useState, useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";

import ModalImage from "react-modal-image";
import api from "../../services/api";

const useStyles = makeStyles(theme => ({
        messageMedia: {
                objectFit: "cover",
                width: 250,
                height: 200,
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
                borderBottomLeftRadius: 8,
                borderBottomRightRadius: 8,
        },
}));

const ModalImageCors = ({ imageUrl }) => {
        const classes = useStyles();
        const [fetching, setFetching] = useState(true);
        const [blobUrl, setBlobUrl] = useState("");
        const [error, setError] = useState(false);

        useEffect(() => {
                if (!imageUrl) return;
                
                const fetchImage = async () => {
                        try {
                                let urlToFetch = imageUrl;
                                
                                // Se for URL absoluta com http(s), usar diretamente sem blob
                                if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
                                        // Para URLs externas, usar diretamente sem passar pelo api
                                        setBlobUrl(imageUrl);
                                        setFetching(false);
                                        return;
                                }
                                
                                // Para URLs relativas (/public/...), buscar via api
                                const { data, headers } = await api.get(urlToFetch, {
                                        responseType: "blob",
                                });
                                const url = window.URL.createObjectURL(
                                        new Blob([data], { type: headers["content-type"] })
                                );
                                setBlobUrl(url);
                                setFetching(false);
                        } catch (err) {
                                console.error("Error fetching image:", err?.response?.status || err.message);
                                setBlobUrl(imageUrl);
                                setFetching(false);
                                setError(true);
                        }
                };
                fetchImage();
        }, [imageUrl]);

        return (
                <ModalImage
                        className={classes.messageMedia}
                        smallSrcSet={fetching ? imageUrl : blobUrl}
                        medium={fetching ? imageUrl : blobUrl}
                        large={fetching ? imageUrl : blobUrl}
                        alt="image"
                />
        );
};

export default ModalImageCors;
