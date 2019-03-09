from django.shortcuts import render, HttpResponse
import requests
import re
# If you are using a Jupyter notebook, uncomment the following line.
#%matplotlib inline
import matplotlib.pyplot as plt
from PIL import Image
from io import BytesIO
import json
from pprint import pprint
import cv2
import os

subscription_key = "96f6e3714eb44c8cb250a7c57e32b3db"
med_api_key = "efb96117-691c-4005-9a73-86920d687c15"
assert subscription_key

vision_base_url = "https://westcentralus.api.cognitive.microsoft.com/vision/v2.0/"
analyze_url = vision_base_url + "ocr"

def process(request):

    print(os.listdir('.//..//patient_privacy//public//images//'))
    image_path = './/..//patient_privacy//public//images//'+request.GET.get('file')


# Read the image into a byte array
    image_data = open(image_path, "rb").read()
    headers    = {'Ocp-Apim-Subscription-Key': subscription_key,
                'Content-Type': 'application/octet-stream'}
    params     = {'visualFeatures': 'Categories,Description,Color'}
    response = requests.post(
        analyze_url, headers=headers, params=params, data=image_data)
    response.raise_for_status()

    # The 'analysis' object contains various fields that describe the image. The most
    # relevant caption for the image is obtained from the 'description' property.
    ocr = response.json()

    non_med_words = []

    regex1 = re.compile('[@_!#$%^&*()<>?/\|}{~:]') 
    regex2 = re.compile('^(?=.?\d)(?!(.*?\.){2,})[\d.]+$|^(?=.?\d)(?!(.*?,){2,})[\d,]+$')

    regions = ocr['regions']
    for x in regions:
        for line in x['lines']:
            for word in line['words']:
                flag = False
                if not regex1.search(word['text']) == None:  
                    flag=True

                elif regex2.search(word['text']):
                    if word['text'].startswith('+91'):
                        flag=True
                        non_med_words.append({'bounding_box':word['boundingBox'],'text':word['text']})
                    else:
                        flag=True

                if flag==False:
                    r = requests.get("https://www.dictionaryapi.com/api/v3/references/medical/json/"+word['text']+"?key="+med_api_key)
                    res = r.json()
                    if  len(res)==0 or type(res[0])==type("abc"):
                        print("nonmed"+word['text'])
                        non_med_words.append({'bounding_box':word['boundingBox'],'text':word['text']})
                    else:
                        print("med"+word['text'])

    for x in non_med_words:
        print(x)

    img = cv2.imread(image_path)
    for i in range(len(non_med_words)):
        box = non_med_words[i]['bounding_box']
        box = box.split(',')
        
        left = int(box[0])
        top = int(box[1])
        width = int(box[2])
        height = int(box[3])

        cv2.rectangle(img, (left, top), (left+width,top+height), (0,0,0), -1)

        cv2.imwrite(image_path,img)

    return HttpResponse("Done")

'''from multiprocessing import Pool

def f(x):
    return x*x

if __name__ == '__main__':
    p = Pool(5)
    print(p.map(f, [1, 2, 3]))'''