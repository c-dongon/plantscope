import React, { useState } from 'react';
import { View, Text, Image, ActivityIndicator, Alert, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import { doc, setDoc, collection, getDocs } from 'firebase/firestore';
import { auth, firestore, storage } from './firebase.client';  
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import Constants from 'expo-constants';

const CaptureScreen = () => {
    const [selectedImage, setSelectedImage] = useState(null);
    const [plantInfo, setPlantInfo] = useState(null);
    const [wikiPlantDetails, setWikiPlantDetails] = useState(null);
    const [wikiImages, setWikiImages] = useState([]); 
    const [loading, setLoading] = useState(false);
    const [buttonDisabled, setButtonDisabled] = useState(true);

    const plantNetApiKey = Constants.expoConfig.extra.plantNetApiKey;

    const resetScreen = () => {
        setSelectedImage(null);
        setPlantInfo(null);
        setWikiPlantDetails(null);
        setWikiImages([]); 
    };

    const retryScan = async () => {
        if (selectedImage) {
            const fileType = selectedImage.split('.').pop();
            identifyPlant(selectedImage, fileType);
        }
    };

    const handleOpenCamera = async () => {
        setLoading(true);
        let result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.cancelled) {
            const fileType = result.uri.split('.').pop();
            setSelectedImage(result.uri);
            identifyPlant(result.uri, fileType);
        } else {
            setLoading(false);
        };
    };

    const handleOpenGallery = async () => {
        setLoading(true);
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.cancelled && result.assets && result.assets.length > 0) {
            const imageUri = result.assets[0].uri;
            const fileType = imageUri.split('.').pop();
            setSelectedImage(imageUri);
            identifyPlant(imageUri, fileType);
        } else {
            setLoading(false);
        };
    }

    const identifyPlant = async (imageUri, fileType) => {
        setLoading(true);
        setButtonDisabled(true); 

        const mimeType = fileType === 'png' ? 'image/png' : 'image/jpeg';

        const formData = new FormData();
        formData.append('organs', 'leaf');
        formData.append('images', {
            uri: imageUri,
            type: mimeType,
            name: `photo.${fileType}`,
        });

        try {
            const response = await axios.post(
                `https://my-api.plantnet.org/v2/identify/all?api-key=${plantNetApiKey}`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );

            if (response.data && response.data.results) {
                const scientificName = response.data.results[0].species.scientificName;
                setPlantInfo(response.data.results[0]);
                await fetchWikiPlantDetails(scientificName);
            } else {
                alert('Plant identification failed.');
            }
        } catch (error) {
            console.error('Error identifying plant:', error);
            alert('Plant identification failed.');
        } finally {
            setLoading(false);
            setTimeout(() => {
                setButtonDisabled(false);
            }, 3000);
        };
    };

    const fetchWikiPlantDetails = async (scientificName) => {
        try {
            const searchResponse = await axios.get('https://en.wikipedia.org/w/api.php', {
                params: {
                    action: 'query',
                    format: 'json',
                    list: 'search',
                    srsearch: scientificName,
                    origin: '*',
                },
            });

            const searchResults = searchResponse.data.query.search;
            if (searchResults.length > 0) {
                const pageTitle = searchResults[0].title;

                const response = await axios.get('https://en.wikipedia.org/w/api.php', {
                    params: {
                        action: 'query',
                        format: 'json',
                        prop: 'extracts|images',
                        exintro: true,
                        explaintext: true,
                        titles: pageTitle,
                        origin: '*',
                    },
                });

                const pages = response.data.query.pages;
                const page = Object.values(pages)[0];

                if (page) {
                    setWikiPlantDetails({
                        title: page.title,
                        extract: page.extract,
                    });

                    const images = await fetchWikiImages(page.pageid);
                    setWikiImages(images);
                } else {
                    alert('No detailed information found for this plant.');
                }
            } else {
                alert('No Wikipedia page found for this plant.');
            }
        } catch (error) {
            console.error('Error fetching Wikipedia data:', error.message);
            alert('Failed to fetch plant information from Wikipedia.');
        }
    };

    const fetchWikiImages = async (pageId) => {
        try {
            const imageResponse = await axios.get('https://en.wikipedia.org/w/api.php', {
                params: {
                    action: 'query',
                    format: 'json',
                    prop: 'images',
                    pageids: pageId,
                    origin: '*',
                },
            });

            const imagePages = imageResponse.data.query.pages[pageId]?.images || [];

            const imageUrls = await Promise.all(
                imagePages.map(async (image) => {
                    const imageUrlResponse = await axios.get('https://en.wikipedia.org/w/api.php', {
                        params: {
                            action: 'query',
                            format: 'json',
                            titles: image.title,
                            prop: 'imageinfo',
                            iiprop: 'url',
                            origin: '*',
                        },
                    });

                    const imgInfo = imageUrlResponse.data.query.pages;
                    const imageDetails = Object.values(imgInfo)[0]?.imageinfo?.[0]?.url;

                    if (imageDetails && /\.(jpg|jpeg|png|gif)$/i.test(imageDetails)) {
                        return imageDetails;
                    }
                    return null;
                })
            );

            return imageUrls.filter((url) => url);
        } catch (error) {
            console.error('Error fetching Wikipedia images:', error);
            return [];
        }
    };

    const addToCollection = async () => {
        if (!selectedImage) {
            Alert.alert('Error', 'No image selected.');
            return;
        }
    
        if (!auth.currentUser) {
            Alert.alert('Error', 'You must be signed in to add a plant to the collection.');
            return;
        }
    
        let imageUrl = selectedImage;
        let plantRefId = null;
    
        if (plantInfo) {
            try {
                const userId = auth.currentUser.uid;
    
                if (selectedImage) {
                    const imageRef = ref(storage, `plants/${userId}/${Date.now()}_${plantInfo.species.scientificName}.jpg`);
                    const response = await fetch(selectedImage);
    
                    if (!response.ok) {
                        throw new Error('Failed to fetch the image');
                    }
    
                    const blob = await response.blob();
                    const uploadResult = await uploadBytes(imageRef, blob);
    
                    imageUrl = await getDownloadURL(uploadResult.ref); 
                }
    
                const newPlant = { plantInfo, wikiPlantDetails, imageUri: imageUrl };
    
                const storedCollection = await AsyncStorage.getItem('plantCollection');
                let updatedCollection = storedCollection ? JSON.parse(storedCollection) : [];
    
                const localDuplicate = updatedCollection.some(
                    (item) => item.plantInfo.species.scientificName.trim().toLowerCase() === plantInfo.species.scientificName.trim().toLowerCase()
                );
    
                if (localDuplicate) {
                    Alert.alert('Duplicate Plant', 'This plant is already in your local collection.');
                    return;
                }
    
                const plantsCollectionRef = collection(firestore, 'users', userId, 'plants');
                const plantsSnapshot = await getDocs(plantsCollectionRef);
    
                const plantExists = plantsSnapshot.docs.some(
                    (doc) => doc.data().plantInfo.species.scientificName.trim().toLowerCase() === plantInfo.species.scientificName.trim().toLowerCase()
                );
    
                if (plantExists) {
                    Alert.alert('Duplicate Plant', 'This plant is already in your Firebase collection.');
                    return;
                }
    
                const plantRef = doc(plantsCollectionRef);
                plantRefId = plantRef.id;
    
                await setDoc(plantRef, { ...newPlant, docId: plantRefId });
    
                updatedCollection.push({ ...newPlant, docId: plantRefId });
                await AsyncStorage.setItem('plantCollection', JSON.stringify(updatedCollection));
    
                Alert.alert('Success', 'Plant added to your collection.');
            } catch (error) {
                console.error('Error adding plant:', error.message);
                Alert.alert('Error', `Failed to add plant to your collection. Error: ${error.message}`);
            }
        }
    };
    

    const formatExtract = (extract) => {
        return extract.split('\n').map((paragraph, index) => (
            <Text key={index} style={styles.paragraph}>
                {paragraph}
            </Text>
        ));
    };

    return (
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', marginTop: 10 }}>
            {loading ? (
                <View>
                    <Text style={styles.loadingMessage}>Identifying Plant!</Text>
                    <ActivityIndicator size="large" color="#74cc60" />
                </View>
            ) : selectedImage && plantInfo ? (
                <>
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.button} onPress={resetScreen}>
                            <Icon name="chevron-back" size={20} color="white" />
                            <Text style={styles.buttonText}>Back</Text>
                        </TouchableOpacity>
    
                        <TouchableOpacity style={buttonDisabled ? styles.disabledButton : styles.button} onPress={addToCollection} disabled={buttonDisabled}>
                            <Icon name="bag-add-outline" size={20} color="white" />
                            <Text style={styles.buttonText}>Add to Collection</Text>
                        </TouchableOpacity>
    
                        <TouchableOpacity style={styles.button} onPress={retryScan}>
                            <Icon name="refresh" size={20} color="white" />
                            <Text style={styles.buttonText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.scoreText}>Confidence: {plantInfo.score.toFixed(2) * 100}%</Text>
                    <Image source={{ uri: selectedImage }} style={styles.selectedPlantImage} />
    
                    {plantInfo && (
                        <View style={{ marginTop: 10, alignItems: 'center' }}>
                            <Text style={styles.commonName}>{plantInfo.species.commonNames[0]}</Text>
                            <Text style={styles.plantDetails}>Plant: {plantInfo.species.scientificName}</Text>
                            <Text style={styles.plantDetails}>Family: {plantInfo.species.family.scientificName}</Text>
                            <Text style={styles.plantDetails}>Genus: {plantInfo.species.genus.scientificName}</Text>
                        </View>
                    )}
    
                    {wikiPlantDetails && (
                        <View style={{ marginTop: 20, alignItems: 'center' }}>
                            <Text style={styles.italicName}>{wikiPlantDetails.title}</Text>
                            {formatExtract(wikiPlantDetails.extract)}
                        </View>
                    )}
    
                    <ScrollView style={styles.imageList} contentContainerStyle={{ alignItems: 'center' }}>
                        <Text style={styles.moreImagesBold}>More images:</Text>
                        {wikiImages.map((imageUrl, index) => (
                            <Image
                                key={index}
                                source={{ uri: imageUrl }}
                                style={styles.wikiImage}
                            />
                        ))}
                    </ScrollView>
                </>
            ) : (
                <View style={styles.container}>
                    <TouchableOpacity style={styles.chooseButton} onPress={handleOpenCamera}>
                        <Icon name="camera" size={40} color="white" style={styles.chooseIcon} />
                        <Text style={styles.chooseButtonText}>Take a Photo</Text>
                    </TouchableOpacity>
    
                    <View style={styles.separator} />
    
                    <TouchableOpacity style={styles.chooseButton} onPress={handleOpenGallery}>
                        <Text style={styles.chooseButtonText}>Choose from Gallery</Text>
                        <Icon name="images" size={40} color="white" style={styles.chooseIcon} />
                    </TouchableOpacity>
                </View>
            )}
        </ScrollView>
    );
    
};

export default CaptureScreen;

const styles = StyleSheet.create({
    selectedPlantImage: {
        width: '80%',
        height: 300,
        borderRadius: 10,
        marginTop: 15,
    },
    plantDetails: {
        fontSize: 16,
        color: 'black',
    },
    scoreText: {
        marginBottom: -5,
    },
    paragraph: {
        marginBottom: 15,
        textAlign: 'left',
        fontSize: 14,
        backgroundColor: 'lightgrey',
        marginTop: 5,
        marginBottom: 5,
        padding: 12,
        lineHeight: 18,
    },
    italicName: {
        fontStyle: 'italic',
    },
    commonName: {
        fontWeight: 'bold',
        fontSize: 20,
    },
    moreImagesBold: {
        fontWeight: 'bold',
        fontSize: 18,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 20,
        marginTop: 8,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#5bc443',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: 'green',
        shadowColor: '#000',
        shadowOffset: { height: 1 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
        elevation: 2,
        marginBottom: 10,
    },
    disabledButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'lightgrey',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: 'darkgrey',
        shadowColor: '#000',
        shadowOffset: { height: 1 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
        elevation: 2,
        marginBottom: 10,
    },
    buttonText: {
        color: 'white',
        marginLeft: 5,
        fontSize: 16,
    },
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    chooseButton: {
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#5bc443',
        paddingVertical: 20,
        paddingHorizontal: 40,
        marginBottom: 20,
        width: 300,
        height: 200,
        borderRadius: 10,
        borderWidth: 4,
        borderColor: 'green',
        shadowColor: '#000',
        shadowOffset: { height: 1 },
        shadowOpacity: 0.75,
        shadowRadius: 6,
        elevation: 2,
    },
    chooseButtonText: {
        color: 'white',
        fontSize: 18,
        marginTop: 0,
    },
    chooseIcon: {
        marginBottom: 0,
        marginTop: 10,
    },
    separator: {
        height: 1,
        width: '80%',
        backgroundColor: 'grey',
        marginVertical: 15,
        alignSelf: 'center',
    },
    imageList: {
        marginTop: 10,
        width: '100%',
    },
    wikiImage: {
        width: '80%',
        height: 300,
        borderRadius: 10,
        marginTop: 15,
    },
    loadingMessage: {
        marginBottom: 10,
        fontSize: 22,
    },
});

