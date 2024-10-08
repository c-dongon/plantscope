import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { firestore } from './firebase.client';
import axios from 'axios';
import Icon from 'react-native-vector-icons/Ionicons';

const FriendDetailScreen = ({ route }) => {
    const { friend } = route.params;
    const [plants, setPlants] = useState([]);
    const [friendUsername, setFriendUsername] = useState(friend.username || '');
    const [selectedPlant, setSelectedPlant] = useState(null); 
    const [wikiPlantDetails, setWikiPlantDetails] = useState(null);
    const [wikiImages, setWikiImages] = useState([]);
    const [loadingWikiData, setLoadingWikiData] = useState(false);

    useEffect(() => {
        const fetchFriendPlants = async () => {
            try {
                const plantsCollection = collection(firestore, 'users', friend.friendId, 'plants');
                const plantsSnapshot = await getDocs(plantsCollection);
                const plantList = plantsSnapshot.docs.map(doc => doc.data());
                setPlants(plantList);
            } catch (error) {
                console.error('Error fetching plants:', error);
            }
        };

        const fetchFriendUsername = async () => {
            if (!friend.username) {
                try {
                    const friendDocRef = doc(firestore, 'users', friend.friendId);
                    const friendDoc = await getDoc(friendDocRef);
                    if (friendDoc.exists()) {
                        setFriendUsername(friendDoc.data().username || 'Unknown');
                    }
                } catch (error) {
                    console.error('Error fetching friend username:', error);
                }
            }
        };

        fetchFriendPlants();
        fetchFriendUsername();
    }, [friend.friendId]);

    const fetchWikiPlantDetails = async (scientificName) => {
        setLoadingWikiData(true);
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
        } finally {
            setLoadingWikiData(false);
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

    const handleBackToCollection = () => {
        setSelectedPlant(null);
        setWikiPlantDetails(null);
        setWikiImages([]);
    };

    const handlePlantSelect = async (plant) => {
        setSelectedPlant(plant);
        await fetchWikiPlantDetails(plant.plantInfo.species.scientificName);
    };

	const formatExtract = (extract) => {
		return extract.split('\n').map((paragraph, index) => (
		<Text key={index} style={styles.paragraph}>
			{paragraph}
		</Text>
		));
	};

    return selectedPlant ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity style={styles.button} onPress={handleBackToCollection}>
                <Icon name="chevron-back" size={20} color="white" />
                <Text style={styles.buttonText}>Back to Collection</Text>
            </TouchableOpacity>
    
            <Text style={styles.sectionTitle}>Submitted Image:</Text>
            {selectedPlant.imageUri ? (
                <Image source={{ uri: selectedPlant.imageUri }} style={styles.selectedPlantImage} />
            ) : (
                <Text>No photo submitted.</Text>
            )}
            <View style={{ marginTop: 10, alignItems: 'center' }}>
                <Text style={styles.commonName}> {selectedPlant.plantInfo.species.commonNames[0]}</Text>
                <Text style={styles.plantDetails}>Plant: {selectedPlant.plantInfo.species.scientificName}</Text>
                <Text style={styles.plantDetails}>Family: {selectedPlant.plantInfo.species.family.scientificName}</Text>
                <Text style={styles.plantDetails}>Genus: {selectedPlant.plantInfo.species.genus.scientificName}</Text>
            </View>
    
            {loadingWikiData ? (
                <ActivityIndicator size="large" color="#74cc60" />
            ) : (
                wikiPlantDetails && (
                    <View style={{ marginTop: 20, alignItems: 'center' }}>
                        <Text style={styles.italicName}>{wikiPlantDetails.title}</Text>
                        {formatExtract(wikiPlantDetails.extract)}
                        {wikiImages.length > 0 && (
                            <View style={styles.imageList} contentContainerStyle={{ alignItems: 'center' }}>
                                <Text style={styles.moreImagesBold}>More images:</Text>
                                {wikiImages.map((imageUrl, index) => (
                                    <Image key={index} source={{ uri: imageUrl }} style={styles.wikiImage} />
                                ))}
                            </View>
                        )}
                    </View>
                )
            )}
        </ScrollView>
    ) : (
        <View style={styles.container}>
            <Text style={styles.totalCountText}>
                Plants Collected: {plants.length}
            </Text>
            <FlatList
                data={plants}
                contentContainerStyle={{ paddingBottom: 50, paddingTop: 20 }}
                renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => handlePlantSelect(item)} style={styles.itemContainer}>
                        {item.imageUri ? (
                            <Image source={{ uri: item.imageUri }} style={styles.plantImage} />
                        ) : (
                            <Text>No photo available.</Text>
                        )}
                        <View style={styles.textContainer}>
                            {item.plantInfo.species.commonNames && (
                                <Text style={styles.commonName}>{item.plantInfo.species.commonNames[0]}</Text>
                            )}
                            <Text style={styles.plantName}>{item.plantInfo.species.scientificName}</Text>
                        </View>
                        <Icon name="chevron-forward" size={24} color="gray" style={styles.arrowIcon} />
                    </TouchableOpacity>
                )}
                keyExtractor={(item, index) => index.toString()}
            />
        </View>
    );
}

export default FriendDetailScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
        paddingTop: 20,
    },
    totalCountText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: -5,
        textAlign: 'center',
    },
	plantImage: {
		width: 80,
		height: 80,
		borderRadius: 10,
		marginRight: 10,
        shadowColor: '#000',
        shadowOffset: { height: 1 },
        shadowOpacity: 0.75,
        shadowRadius: 6,
        elevation: 2,
	},
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    textContainer: {
        flex: 1,
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
    plantName: {
        fontSize: 14,
        color: 'gray',
    },
	italicName: {
		fontStyle: 'italic',
    },
    commonName: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    arrowIcon: {
        marginLeft: 'auto',
    },
    selectedPlantImage: {
        width: '80%',
        height: 300,
        borderRadius: 10,
        marginTop: 15,
        shadowColor: '#000',
        shadowOffset: { height: 1 },
        shadowOpacity: 0.75,
        shadowRadius: 6,
        elevation: 2,
    },
	sectionTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		marginTop: 0,
		marginBottom: 0,
	},
    plantDetails: {
        fontSize: 16,
        color: 'black',
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
        marginTop: 10,
        alignSelf: 'center'
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#5bc443',
        paddingVertical: 10,
        paddingHorizontal: 10,
        marginTop: 10,
        marginBottom: 10,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: 'green',
        shadowColor: '#000',
        shadowOffset: { height: 1 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
        elevation: 2,
    },
    buttonText: {
        color: 'white',
        marginLeft: 5,
        fontSize: 16,
    },
	wikiImage: {
		width: '80%',
        aspectRatio: 1,
		height: 300,
		borderRadius: 10,
		marginTop: 15,

	},
});
