import os
import sys
import json
import itertools
import requests
from typing import Iterable
from pixivpy3 import AppPixivAPI

api = AppPixivAPI()


def auth():
    refresh_token = os.getenv('PIXIV_REFRESH_TOKEN')
    api.auth(refresh_token=refresh_token)


def illusts(tags: Iterable[str]):
    word = ' '.join(tags)
    offset = 0
    while True:
        print('searching:', word, 'offset:', offset, file=sys.stderr)
        ills = api.search_illust(word,
                                 search_target='partial_match_for_tags',
                                 sort='popular_desc',
                                 duration='within_last_day',
                                 offset=offset).illusts
        if len(ills) == 0:
            return
        offset += len(ills)
        for ill in ills:
            yield ill


def is_r18(ill):
    return any(filter(lambda tag: tag.name.find('R-18') >= 0, ill.tags))


blacklist = set(['R18', 'R-18'])


def search(tags):
    auth()

    tags = list(filter(lambda tag: tag not in blacklist, tags))

    if len(tags) == 0:
        tags = ["オリジナル", "女の子"]

    ills = filter(
        lambda ill: ill.page_count == 1 and ill.total_bookmarks > 150 and
        not is_r18(ill), illusts(tags))
    ills = map(
        # lambda ill: {
        #     'id': ill.id,
        #     'title': ill.title,
        #     'author': ill.user.name,
        #     'tags': list(map(lambda tag: tag.name, ill.tags)),
        #     'view': ill.total_view,
        #     'bookmark': ill.total_bookmarks,
        # },
        lambda ill: ill.id,
        ills)

    json.dump(list(itertools.islice(ills, 10)), sys.stdout, ensure_ascii=False)


def download_small(ids):
    auth()
    result = []
    for id in ids:
        url = api.illust_detail(id).illust.image_urls.square_medium
        res = requests.get(url, headers={'Referer': 'https://www.pixiv.net/'})
        if res.status_code != 200:
            print('download failed:', id, file=sys.stderr)
            continue
        filename = url.split('/')[-1]
        result.append((id, filename))
        with open(filename, 'wb') as f:
            f.write(res.content)
    print(json.dumps(result, ensure_ascii=False))


def download(ids):
    auth()
    result = []
    for id in ids:
        url = api.illust_detail(id).illust.meta_single_page.original_image_url
        res = requests.get(url, headers={'Referer': 'https://www.pixiv.net/'})
        if res.status_code != 200:
            print('download failed:', id, file=sys.stderr)
            continue
        filename = url.split('/')[-1]
        result.append((id, filename))
        with open(filename, 'wb') as f:
            f.write(res.content)
    print(json.dumps(result, ensure_ascii=False))


def main():
    if len(sys.argv) < 2:
        print('usage: python search_ill.py action args1 ...')
        return

    action = sys.argv[1]
    args = sys.argv[2:]
    if action == 'search':
        search(args)
    elif action == 'download_small':
        download_small(args)
    elif action == 'download':
        download(args)
    else:
        print('usage: python search_ill.py action args1 ...')


if __name__ == '__main__':
    main()
