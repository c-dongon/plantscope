import React, { useState } from 'react';
import { View, Text, Button, Image, ActivityIndicator, Alert, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';

const CaptureScreen = ({ navigation }) => {
	const [selectedImage, setSelectedImage] = useState(null);
	const [plantInfo, setPlantInfo] = useState(null);
	const [wikiPlantDetails, setWikiPlantDetails] = useState(null);
	const [wikiImages, setWikiImages] = useState([]); 
	const [loading, setLoading] = useState(false);

	const plantNetApiKey = '2b10Q2hPncLcNlnBAAkDqaO';

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
		let result = await ImagePicker.launchCameraAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsEditing: true,
			quality: 1,
		});

		if (!result.cancelled) {
			const fileType = result.uri.split('.').pop();
			setSelectedImage(result.uri);
			identifyPlant(result.uri, fileType);
		}
	};

	const handleOpenGallery = async () => {
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
		}
	};

	const identifyPlant = async (imageUri, fileType) => {
		setLoading(true);

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
				fetchWikiPlantDetails(scientificName);
			} else {
				alert('Plant identification failed.');
			}
		} catch (error) {
			console.error('Error identifying plant:', error);
			alert('Plant identification failed.');
		} finally {
			setLoading(false);
		}
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
		if (plantInfo) {
			const newPlant = { plantInfo, wikiPlantDetails, imageUri: selectedImage };

			try {
				const storedCollection = await AsyncStorage.getItem('plantCollection');
				let updatedCollection = storedCollection ? JSON.parse(storedCollection) : [];

				const duplicate = updatedCollection.find(
					(item) => item.plantInfo.species.scientificName === plantInfo.species.scientificName
				);

				if (duplicate) {
					Alert.alert('Duplicate Plant', 'This plant is already in your collection.');
					return;
				}

				updatedCollection.push(newPlant);
				await AsyncStorage.setItem('plantCollection', JSON.stringify(updatedCollection));
				Alert.alert('Success', 'Plant added to your collection.');
			} catch (error) {
				console.error('Error saving collection:', error);
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
			{selectedImage ? (
				<>
					{loading ? (
						<View>
							<Text style={styles.loadingMessage}>Identifying Plant!</Text>
							<ActivityIndicator size="large" color="#74cc60" />
						</View>
					) : (
						<>
							<View style={styles.buttonContainer}>
								<TouchableOpacity style={styles.button} onPress={resetScreen}>
									<Icon name="chevron-back" size={20} color="white" />
									<Text style={styles.buttonText}>Back</Text>
								</TouchableOpacity>

								<TouchableOpacity style={styles.button} onPress={addToCollection}>
									<Icon name="bag-add-outline" size={20} color="white" />
									<Text style={styles.buttonText}>Add to Collection</Text>
								</TouchableOpacity>

								<TouchableOpacity style={styles.button} onPress={retryScan}>
									<Icon name="refresh" size={20} color="white" />
									<Text style={styles.buttonText}>Retry</Text>
								</TouchableOpacity>
							</View>

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
									{/* seperate paragraphs */}
									{formatExtract(wikiPlantDetails.extract)}
								</View>
							)}

							{/* display wikipedia images */}
							<ScrollView style={styles.imageList} contentContainerStyle={{ alignItems: 'center' }}>
								<Text style={styles.moreImagesBold}>More images:</Text>
								{wikiImages
									.filter((imageUrl) => imageUrl)
									.map((imageUrl, index) => (
									<Image
										key={index}
										source={{ uri: imageUrl }}
										style={styles.wikiImage}
									/>
									))}
							</ScrollView>
						</>
					)}
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
		borderRadius: 10,
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
		borderRadius: 10,
		marginBottom: 20,
		width: 300,
		height: 200,
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

	}
});
