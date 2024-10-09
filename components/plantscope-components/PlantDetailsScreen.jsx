import React, { useEffect, useState } from 'react';
import { View, Text, Image, Alert, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Icon from 'react-native-vector-icons/Ionicons';
import { auth, firestore } from './firebase.client';
import { doc, deleteDoc } from 'firebase/firestore';

const PlantDetailsScreen = ({ route, navigation }) => {
	const { plant } = route.params;
	const [wikiPlantDetails, setWikiPlantDetails] = useState(null);
	const [wikiImages, setWikiImages] = useState([]);

	useEffect(() => {
		if (plant.plantInfo) {
			fetchWikiPlantDetails(plant.plantInfo.species.scientificName);
		}
	}, []);

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
	  
	const handleRemovePlant = async () => {
		try {
			const userId = auth.currentUser ? auth.currentUser.uid : null;
			const plantDocId = plant.docId; 
	
			if (!plantDocId) {
				console.error("Plant docId is missing or null");
				return;
			}
	
			if (userId && plantDocId) {
				const plantRef = doc(firestore, 'users', userId, 'plants', plantDocId);
				await deleteDoc(plantRef); 
	
				const storedCollection = await AsyncStorage.getItem('plantCollection');
				if (storedCollection) {
					const updatedCollection = JSON.parse(storedCollection).filter(
						(item) => item.docId !== plantDocId
					);
					await AsyncStorage.setItem('plantCollection', JSON.stringify(updatedCollection));
				}
	
				Alert.alert('Success', 'Plant removed from your collection.');
				navigation.goBack();
			}
		} catch (error) {
			console.error('Error removing plant:', error.message);
			Alert.alert('Error', 'Failed to remove plant.');
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
		<ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}>
			{/* planetnet api info */}
			<View style={styles.buttonContainer}>
				<TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
					<Icon name="chevron-back" size={20} color="white" />
					<Text style={styles.buttonText}>Back</Text>
				</TouchableOpacity>
				<TouchableOpacity style={styles.button} onPress={handleRemovePlant}>
					<Icon name="bag-remove-outline" size={20} color="white" />
					<Text style={styles.buttonText}>Remove Plant</Text>
				</TouchableOpacity>
			</View>

			{/* submitted image */}
			<Text style={styles.scoreText}>Confidence: {plant.plantInfo.score.toFixed(2) * 100}%</Text>
			<Text style={styles.sectionTitle}>Submitted Image:</Text>
			{plant.imageUri ? (
				<Image source={{ uri: plant.imageUri }} style={styles.selectedPlantImage} />
			) : (
				<Text>No photo submitted.</Text>
			)}

			<View style={{ marginTop: 10, alignItems: 'center' }}>
				<Text style={styles.commonName}> {plant.plantInfo.species.commonNames[0]}</Text>
				<Text style={styles.plantDetails}>Plant: {plant.plantInfo.species.scientificName}</Text>
				<Text style={styles.plantDetails}>Family: {plant.plantInfo.species.family.scientificName}</Text>
				<Text style={styles.plantDetails}>Genus: {plant.plantInfo.species.genus.scientificName}</Text>
			</View>

			{/* wiki info */}
			{wikiPlantDetails && (
				<View style={{ marginTop: 20, alignItems: 'center' }}>
					<Text style={styles.italicName}>{wikiPlantDetails.title}</Text>
					{formatExtract(wikiPlantDetails.extract)}
				</View>
			)}

			{/* wiki images */}
			{wikiImages && wikiImages.length > 0 && (
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
			)}
		</ScrollView>
	);
};

export default PlantDetailsScreen;

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
	sectionTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		marginTop: 0,
		marginBottom: -5,
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
});