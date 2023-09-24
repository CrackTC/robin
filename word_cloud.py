import sys
from jieba.posseg import cut, pair
from wordcloud import WordCloud
from typing import Callable, Iterable, Dict, List


class Config:

    def __init__(self, font_path: str, input: str, output: str, width: int,
                 height: int) -> None:
        self.font_path = font_path
        self.input = input
        self.output = output
        self.width = width
        self.height = height


def explode_args(args: Iterable[str]) -> Dict[str, str]:
    arg_dict = {}
    for arg in args:
        idx = arg.find('=')
        if idx != -1:
            arg_dict[arg[2:idx]] = arg[idx + 1:]

    return arg_dict


def get_text(input: str) -> str:
    if input == '':
        return sys.stdin.read()
    else:
        return open(input).read()


def default_pred(p: pair):
    blacklist = ["ad", "c", "d", "x", "r", "u", "z", "y"]
    for not_allowed in blacklist:
        if p.flag.startswith(not_allowed):
            return False

    if p.flag.startswith("v") and len(p.word) < 2:
        return False

    return True


def get_words(text: str,
              pred: Callable[[pair], bool] = default_pred) -> List[str]:
    return list(map(lambda p: p.word, filter(pred, cut(text))))


def get_freq_dict(words: Iterable) -> Dict[str, int]:
    word_dict = {}
    for word in words:
        if word_dict.get(word) == None:
            word_dict[word] = 1
        else:
            word_dict[word] += 1
    return word_dict


def generate_word_cloud(config: Config):
    word_dict = get_freq_dict(get_words(get_text(config.input)))
    WordCloud(config.font_path, config.width,
              config.height).generate_from_frequencies(word_dict).to_file(
                  config.output)


def main():
    arg_dict = explode_args(sys.argv)
    config = Config(
        arg_dict.get('font-path') or './fonts/MapleMono-SC-NF-Regular.ttf',
        arg_dict.get('input') or '',
        arg_dict.get('output') or './result.png',
        int(arg_dict.get('width') or '1280'),
        int(arg_dict.get('height') or '720'))
    generate_word_cloud(config)


if __name__ == '__main__':
    main()
